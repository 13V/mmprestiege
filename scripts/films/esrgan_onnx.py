"""Converts Real-ESRGAN's realesr-general-x4v3 weights to an ONNX model
without PyTorch.

The .pth files are read with a restricted unpickler that only rebuilds
float tensors and ordered dicts; any other pickled object is refused.
Usage: python -I esrgan_onnx.py <general.pth> <wdn.pth> <denoise 0-1> <out.onnx>
The two sets of weights are blended like Real-ESRGAN's -dn option
(1 = the general model, 0 = the denoising wdn model).
"""
import collections
import pickle
import sys
import zipfile

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper


class _Storage:
    def __init__(self, dtype):
        self.dtype = dtype


def _rebuild_tensor_v2(storage, offset, size, stride, *_):
    flat = storage
    if not size:
        return flat[offset].copy()
    itemsize = flat.itemsize
    view = np.lib.stride_tricks.as_strided(flat[offset:], shape=tuple(size), strides=tuple(s * itemsize for s in stride))
    return view.copy()


def load_state(path):
    archive = zipfile.ZipFile(path)
    prefix = archive.namelist()[0].split("/")[0]

    class Restricted(pickle.Unpickler):
        def find_class(self, module, name):
            if (module, name) == ("collections", "OrderedDict"):
                return collections.OrderedDict
            if (module, name) == ("torch._utils", "_rebuild_tensor_v2"):
                return _rebuild_tensor_v2
            if module == "torch" and name == "FloatStorage":
                return _Storage(np.float32)
            raise pickle.UnpicklingError(f"refused {module}.{name}")

        def persistent_load(self, pid):
            kind, storage_type, key, _location, _numel = pid
            assert kind == "storage" and isinstance(storage_type, _Storage)
            data = archive.read(f"{prefix}/data/{key}")
            return np.frombuffer(data, dtype=storage_type.dtype)

    with archive.open(f"{prefix}/data.pkl") as fh:
        state = Restricted(fh).load()
    return state.get("params", state.get("params_ema", state))


def build(general, wdn, strength, out):
    a, b = load_state(general), load_state(wdn)
    weights = {k: strength * a[k] + (1 - strength) * b[k] for k in a}
    convs = sorted({int(k.split(".")[1]) for k in weights if k.endswith(".bias")})
    nodes, inits = [], []
    x = "input"
    for i in convs:
        w, bias = weights[f"body.{i}.weight"], weights[f"body.{i}.bias"]
        inits += [numpy_helper.from_array(w.astype(np.float32), f"w{i}"), numpy_helper.from_array(bias.astype(np.float32), f"b{i}")]
        nodes.append(helper.make_node("Conv", [x, f"w{i}", f"b{i}"], [f"c{i}"], kernel_shape=[3, 3], pads=[1, 1, 1, 1]))
        x = f"c{i}"
        prelu = f"body.{i + 1}.weight"
        if prelu in weights:
            slope = weights[prelu].astype(np.float32).reshape(-1, 1, 1)
            inits.append(numpy_helper.from_array(slope, f"p{i}"))
            nodes.append(helper.make_node("PRelu", [x, f"p{i}"], [f"a{i}"]))
            x = f"a{i}"
    nodes.append(helper.make_node("DepthToSpace", [x], ["up"], blocksize=4, mode="CRD"))
    inits.append(numpy_helper.from_array(np.array([1, 1, 4, 4], dtype=np.float32), "scales"))
    nodes.append(helper.make_node("Resize", ["input", "", "scales"], ["base"], mode="nearest"))
    nodes.append(helper.make_node("Add", ["up", "base"], ["output"]))
    graph = helper.make_graph(
        nodes, "realesr-general-x4v3",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, "h", "w"])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, "H", "W"])],
        inits,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8  # readable by older ONNX runtimes
    onnx.checker.check_model(model)
    onnx.save(model, out)
    print(f"{out}: {len(convs)} convs, denoise blend {strength}")


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4])
