// The stock manager at /stock/manage: Madi signs in, adds a car from its rego
// (or VIN) and state, checks the details, adds photos and puts it on the
// website. The API is /api/stock (server/stock/handler.js).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  ImagePlus,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { money, number } from "../data";
import { smallest } from "../images";
import { newPhotoId, preparePhoto } from "./photos";
import "./stock-admin.css";

const STATES = ["SA", "NSW", "VIC", "QLD", "WA", "TAS", "NT", "ACT"];
const BODIES = ["Sedan", "Ute", "Wagon", "Hatch", "Coupe", "Convertible", "SUV", "Van"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const FUELS = ["Petrol", "Diesel", "LPG", "Hybrid", "Electric"];
const TAGS = ["JUST ARRIVED", "LOW KMS", "THE ICON", "ENTHUSIAST PICK", "PRESTIGE", "COLLECTOR GRADE", "PRICE REDUCED"];
const MAKES = [
  "HSV", "Holden", "FPV", "Ford", "Chrysler", "Dodge", "Chevrolet", "Toyota", "Nissan", "Mitsubishi",
  "Subaru", "Mazda", "Honda", "Lexus", "BMW", "Mercedes-Benz", "Audi", "Porsche", "Ferrari",
  "Lamborghini", "Volkswagen", "Jeep", "Land Rover",
];
const LABELS = {
  year: "Year",
  make: "Make",
  model: "Model",
  variant: "Variant",
  body: "Body",
  colour: "Colour",
  transmission: "Gearbox",
  engine: "Engine",
  fuel: "Fuel",
  vin: "VIN",
  regoExpiry: "Rego expires",
  insurer: "CTP insurer",
  nvic: "NVIC",
  engineNumber: "Engine number",
  vehicleCode: "Vehicle code",
  compliance: "Compliance",
  registration: "Registration",
  chassis: "Chassis number",
};
const SETUP_GUIDE = "https://github.com/13V/mmprestiege/blob/main/docs/stock-manager.md";

// --- API -------------------------------------------------------------------

class ApiError extends Error {}
async function api(op, { method = "POST", body, form } = {}) {
  let response;
  try {
    response = await fetch(`/api/stock?op=${op}`, {
      method,
      credentials: "same-origin",
      headers:
        method === "GET"
          ? {}
          : { "x-mm-stock": "1", ...(form ? {} : { "content-type": "application/json" }) },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw Object.assign(new ApiError("No connection. Check your signal and try again."), { code: "offline" });
  }
  const data = await response.json().catch(() => null);
  if (!data?.ok)
    throw Object.assign(new ApiError(data?.message || "Something went wrong. Try again in a moment."), {
      code: data?.code || "error",
      status: response.status,
    });
  return data;
}

// --- Helpers ---------------------------------------------------------------

// The smallest copy of a photo, for thumbnails.
const thumbnail = (photo) => photo.srcset?.split(",")[0].trim().split(/\s+/)[0] || smallest(photo.src);
const title = (car) => [car.year, car.make, car.model].filter(Boolean).join(" ") || "New car";
const blankCar = () => ({
  id: "",
  status: "draft",
  stock: "",
  year: "",
  make: "",
  model: "",
  variant: "",
  body: "",
  colour: "",
  transmission: "",
  engine: "",
  fuel: "Petrol",
  power: "",
  kms: "",
  price: "",
  tag: "",
  description: "",
  rego: "",
  state: "SA",
  vin: "",
  regoExpiry: "",
  photos: [],
  lookup: null,
});
// Form state uses strings; the server turns them back into numbers.
const toForm = (car) => ({
  ...blankCar(),
  ...car,
  year: car.year ?? "",
  kms: car.kms ?? "",
  price: car.price ?? "",
  photos: (car.photos || []).map((photo) => ({ ...photo, state: "ready" })),
});
const fromForm = (draft) => ({
  ...draft,
  photos: draft.photos
    .filter((photo) => photo.state === "ready")
    .map(({ id, src, srcset, width, height, share }) => ({ id, src, srcset, width, height, share })),
});
const formatDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";
const STATUS_TEXT = { draft: "Draft", available: "On the website", sold: "Sold" };

function useFocusOnChange(key) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [key]);
  return ref;
}

// --- Page ------------------------------------------------------------------

export default function StockAdmin() {
  const [status, setStatus] = useState(null);
  const [stock, setStock] = useState(null);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState(null);
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(null); // a car being added, before it's saved

  const loadStatus = useCallback(async () => {
    try {
      const data = await api("status", { method: "GET" });
      setStatus(data);
      setFailure("");
      return data;
    } catch (error) {
      setFailure(error.message);
      return null;
    }
  }, []);
  const loadStock = useCallback(async () => {
    try {
      const data = await api("stock", { method: "GET" });
      setStock(data);
      return data;
    } catch (error) {
      if (error.code === "signed_out") setStatus((current) => current && { ...current, signedIn: false });
      else setFailure(error.message);
      return null;
    }
  }, []);
  useEffect(() => {
    loadStatus().then((data) => {
      if (data?.signedIn && data.setup.storage) loadStock();
    });
  }, [loadStatus, loadStock]);
  useEffect(() => {
    if (!notice || notice.sticky) return undefined;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Any request that finds the session expired returns here to sign in.
  const handleError = useCallback((error) => {
    if (error.code === "signed_out") {
      setStatus((current) => current && { ...current, signedIn: false });
      setNotice({ tone: "warn", text: "You were signed out. Sign in again, then save; your changes are still here." });
    } else setNotice({ tone: "error", text: error.message, conflict: error.code === "conflict" });
  }, []);

  const go = (next) => setParams(next, { replace: false });
  // Signed out while working (the session ran out): sign in over the
  // current screen, so nothing typed is lost.
  const sessionLost = Boolean(status?.setup.login && !status.signedIn && stock);
  const view = params.get("car") ? "edit" : params.get("add") ? "add" : "list";

  let body;
  if (failure && !status)
    body = <Message title="Can't reach the stock manager" text={failure} action={["Try again", () => window.location.reload()]} />;
  else if (!status) body = <Loading />;
  else if (!status.setup.login) body = <Setup setup={status.setup} />;
  else if (!status.signedIn && !stock)
    body = (
      <SignIn
        onDone={async () => {
          const data = await loadStatus();
          if (data?.setup.storage) await loadStock();
        }}
      />
    );
  else if (!status.setup.storage) body = <Setup setup={status.setup} signedIn />;
  else if (!stock) body = failure ? <Message title="The stock didn't load" text={failure} action={["Try again", loadStock]} /> : <Loading />;
  else if (view === "add")
    body = (
      <FindCar
        cars={stock.cars}
        credits={stock.credits}
        lookupReady={Boolean(status.setup.lookup)}
        onOpen={(id) => go({ car: id })}
        onUse={(car) => {
          setDraft(car);
          go({ car: "new" });
        }}
        onCancel={() => go({})}
        onError={handleError}
      />
    );
  else if (view === "edit") {
    const id = params.get("car");
    const existing = stock.cars.find((car) => car.id === id);
    const start = id === "new" ? draft : existing && toForm(existing);
    body = !start && id === "new" ? (
      <Message
        title="Start again"
        text="The car you were adding wasn't saved before the page reloaded."
        action={["Add a car", () => go({ add: "1" })]}
      />
    ) : start ? (
      <EditCar
        key={id === "new" ? `new-${start.lookup?.at || "manual"}` : id}
        initial={start}
        isNew={id === "new"}
        version={stock.version}
        onSaved={(data, message) => {
          setStock((current) => ({ ...current, version: data.version, cars: data.cars }));
          setDraft(null);
          setNotice(message);
          go({});
        }}
        onDeleted={(data) => {
          setStock((current) => ({ ...current, version: data.version, cars: data.cars }));
          setNotice({ tone: "ok", text: data.publish?.message || "Car deleted." });
          go({});
        }}
        onCancel={() => go({})}
        onError={handleError}
      />
    ) : (
      <Message title="That car isn't in your stock" text="It may have been deleted on another device." action={["Back to stock", () => go({})]} />
    );
  } else
    body = (
      <StockList
        stock={stock}
        setup={status.setup}
        onAdd={() => go({ add: "1" })}
        onManual={() => {
          setDraft(blankCar());
          go({ car: "new" });
        }}
        onOpen={(id) => go({ car: id })}
        onImported={(data) => {
          setStock((current) => ({ ...current, version: data.version, cars: data.cars }));
          setNotice({
            tone: "ok",
            text: data.imported
              ? `Copied ${data.imported} listings in as drafts. Check each one's price and kilometres before putting it on the website.`
              : "Those listings are already in your stock.",
          });
        }}
        onPublished={(publish) => setNotice({ tone: publish.state === "failed" ? "error" : "ok", text: publish.message })}
        onError={handleError}
      />
    );

  return (
    <div className="sa">
      <header className="sa-top">
        <Link to="/" className="sa-brand" aria-label="MM Prestige Motors website">
          <b>MM Prestige</b>
          <small>Stock manager</small>
        </Link>
        {status?.signedIn && (
          <nav className="sa-top-actions" aria-label="Stock manager">
            <a href="/stock" target="_blank" rel="noreferrer" className="sa-ghost">
              Website <ExternalLink size={14} aria-hidden="true" />
            </a>
            <button
              type="button"
              className="sa-ghost"
              onClick={async () => {
                await api("logout").catch(() => {});
                setStock(null);
                setStatus((current) => ({ ...current, signedIn: false }));
                go({});
              }}
            >
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </nav>
        )}
      </header>
      {status?.mode === "development" && (
        <p className="sa-dev-banner">
          Development server: cars are saved in a local folder and lookups use sample records (try SA S123ABC).
        </p>
      )}
      <main className="sa-main" inert={sessionLost || undefined}>
        {body}
      </main>
      {sessionLost && (
        <div className="sa-overlay" role="dialog" aria-modal="true" aria-label="Sign in again">
          <SignIn
            again
            onDone={async () => {
              await loadStatus();
            }}
          />
        </div>
      )}
      <div className="sa-toast-region" role="status" aria-live="polite">
        {notice && (
          <div className={`sa-toast is-${notice.tone || "ok"}`}>
            <span>{notice.text}</span>
            {notice.conflict && (
              <button
                type="button"
                onClick={async () => {
                  await loadStock();
                  setNotice({ tone: "ok", text: "Reloaded. Check your changes and save again." });
                }}
              >
                Reload
              </button>
            )}
            <button type="button" className="sa-toast-close" aria-label="Dismiss" onClick={() => setNotice(null)}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="sa-loading" role="status">
      <Loader2 className="sa-spin" size={22} aria-hidden="true" /> Loading…
    </div>
  );
}

function Message({ title: heading, text, action }) {
  const ref = useFocusOnChange(heading);
  return (
    <section className="sa-panel sa-message">
      <h1 tabIndex={-1} ref={ref}>
        {heading}
      </h1>
      <p>{text}</p>
      {action && (
        <button type="button" className="sa-button" onClick={action[1]}>
          {action[0]}
        </button>
      )}
    </section>
  );
}

// --- Setup ---------------------------------------------------------------

function Setup({ setup, signedIn = false }) {
  const ref = useFocusOnChange("setup");
  const items = [
    {
      done: setup.login,
      title: "Sign-in password",
      text: setup.passwordTooShort
        ? "STOCK_ADMIN_PASSWORD is set but too short. Use at least 10 characters."
        : "Add STOCK_ADMIN_PASSWORD (at least 10 characters) in the Vercel project's environment variables.",
    },
    {
      done: Boolean(setup.storage),
      title: "Storage for cars and photos",
      text: "In Vercel, create a public Blob store and connect it to this project.",
    },
    {
      done: Boolean(setup.lookup),
      title: "Rego lookup",
      text: "Add REGCHECK_USERNAME from a CarRegistrationAPI account. Without it, details are typed in by hand.",
      optional: true,
    },
    {
      done: Boolean(setup.publish),
      title: "Automatic website updates",
      text: "Add STOCK_DEPLOY_HOOK_URL (a Vercel deploy hook) so saved changes go live by themselves.",
      optional: true,
    },
  ];
  return (
    <section className="sa-panel">
      <h1 tabIndex={-1} ref={ref}>
        {signedIn ? "Almost ready" : "Set up the stock manager"}
      </h1>
      <p className="sa-lead">
        A few settings in Vercel switch it on. Each takes a minute; then redeploy the site.
      </p>
      <ol className="sa-setup">
        {items.map((item) => (
          <li key={item.title} className={item.done ? "is-done" : ""}>
            {item.done ? <Check size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
            <div>
              <strong>
                {item.title}
                {item.optional && <em> · optional</em>}
                <span className="sa-visually-hidden">{item.done ? " (done)" : " (to do)"}</span>
              </strong>
              {!item.done && <p>{item.text}</p>}
            </div>
          </li>
        ))}
      </ol>
      <a className="sa-button is-secondary" href={SETUP_GUIDE} target="_blank" rel="noreferrer">
        Step-by-step setup guide <ExternalLink size={15} aria-hidden="true" />
      </a>
    </section>
  );
}

// --- Sign in -------------------------------------------------------------

function SignIn({ onDone, again = false }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useFocusOnChange("signin");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("login", { body: { password } });
      setPassword("");
      await onDone();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }
  return (
    <section className="sa-panel sa-signin">
      <h1 tabIndex={-1} ref={ref}>
        {again ? "Sign in again" : "Sign in"}
      </h1>
      <p className="sa-lead">
        {again ? "You were signed out. Your changes are still here." : "Add and update the cars on the website."}
      </p>
      <form onSubmit={submit}>
        <label className="sa-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signin-error" : undefined}
          />
        </label>
        {error && (
          <p className="sa-error" id="signin-error" role="alert">
            {error}
          </p>
        )}
        <button className="sa-button is-primary is-wide" disabled={busy || !password}>
          {busy ? <Loader2 className="sa-spin" size={16} aria-hidden="true" /> : null}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}

// --- Stock list ------------------------------------------------------------

function StockList({ stock, setup, onAdd, onManual, onOpen, onImported, onPublished, onError }) {
  const [tab, setTab] = useState("available");
  const [busy, setBusy] = useState("");
  const ref = useFocusOnChange("list");
  const groups = useMemo(
    () => ({
      available: stock.cars.filter((car) => car.status === "available"),
      draft: stock.cars.filter((car) => car.status === "draft"),
      sold: stock.cars.filter((car) => car.status === "sold"),
    }),
    [stock.cars],
  );
  const shown = groups[tab];
  async function importListings() {
    setBusy("import");
    try {
      onImported(await api("import", { body: { expectedVersion: stock.version } }));
      setTab("draft");
    } catch (error) {
      onError(error);
    } finally {
      setBusy("");
    }
  }
  async function publish() {
    setBusy("publish");
    try {
      onPublished((await api("publish")).publish);
    } catch (error) {
      onError(error);
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="sa-list">
      <div className="sa-list-head">
        <h1 tabIndex={-1} ref={ref}>
          Your stock
        </h1>
        <button type="button" className="sa-button is-primary" onClick={onAdd}>
          <Plus size={17} aria-hidden="true" /> Add a car
        </button>
      </div>
      {stock.cars.length === 0 ? (
        <div className="sa-panel sa-empty">
          <h2>No cars yet</h2>
          <p>
            Tap <b>Add a car</b> and enter the rego and state: the details fill themselves in. Add photos,
            the price and kilometres, and put it on the website.
          </p>
          <p>
            The website shows sample listings until the first car goes on it. You can copy those six in as drafts
            and correct them.
          </p>
          <div className="sa-row">
            <button type="button" className="sa-button is-secondary" onClick={importListings} disabled={busy === "import"}>
              {busy === "import" && <Loader2 className="sa-spin" size={15} aria-hidden="true" />}
              Copy in the current listings
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sa-tabs" role="tablist" aria-label="Cars">
            {[
              ["available", "On the website"],
              ["draft", "Drafts"],
              ["sold", "Sold"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "is-selected" : ""}
                onClick={() => setTab(key)}
              >
                {label} <span>{groups[key].length}</span>
              </button>
            ))}
          </div>
          {shown.length ? (
            <ul className="sa-cars" role="tabpanel" aria-label={STATUS_TEXT[tab]}>
              {shown.map((car) => (
                <li key={car.id}>
                  <button type="button" className="sa-car" onClick={() => onOpen(car.id)}>
                    <span className="sa-thumb">
                      {car.photos[0] ? (
                        <img src={thumbnail(car.photos[0])} alt="" loading="lazy" />
                      ) : (
                        <ImagePlus size={20} aria-hidden="true" />
                      )}
                    </span>
                    <span className="sa-car-text">
                      <strong>{title(car)}</strong>
                      <small>
                        {[
                          car.stock,
                          car.price ? money(car.price) : "No price",
                          car.kms != null ? `${number(car.kms)} km` : null,
                          car.rego ? `${car.rego} ${car.state}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                      {car.importedFrom && car.status === "draft" && <em>Copied from the old listings · check the details</em>}
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sa-none">
              {tab === "available"
                ? "No cars on the website. Put a draft on, or add a car."
                : tab === "draft"
                  ? "No drafts."
                  : "No sold cars."}
            </p>
          )}
        </>
      )}
      <footer className="sa-list-foot">
        {setup.lookup ? (
          <span>
            Rego lookup: {setup.lookup}
            {stock.credits != null && ` · ${stock.credits} lookups left`}
          </span>
        ) : (
          <span>Rego lookup isn't connected, so details are typed in by hand.</span>
        )}
        <button type="button" className="sa-link" onClick={onManual}>
          Add a car without a rego
        </button>
        {setup.publish && stock.cars.some((car) => car.status !== "draft") && (
          <button type="button" className="sa-link" onClick={publish} disabled={busy === "publish"}>
            <RefreshCw size={13} aria-hidden="true" /> Update website now
          </button>
        )}
      </footer>
    </section>
  );
}

// --- Find a car ------------------------------------------------------------

function FindCar({ cars, credits, lookupReady, onOpen, onUse, onCancel, onError }) {
  const [mode, setMode] = useState("rego");
  const [rego, setRego] = useState("");
  const [state, setState] = useState("SA");
  const [vin, setVin] = useState("");
  const [phase, setPhase] = useState({ name: "idle" });
  const ref = useFocusOnChange("find");
  const resultRef = useRef(null);
  const query = mode === "rego" ? rego.toUpperCase().replace(/[^A-Z0-9]/g, "") : vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const already = cars.find((car) =>
    mode === "rego" ? query && car.rego === query && car.state === state : query && car.vin === query,
  );
  useEffect(() => {
    if (phase.name === "found" || phase.name === "error") resultRef.current?.focus();
  }, [phase]);

  async function find(event) {
    event.preventDefault();
    if (!lookupReady) return;
    setPhase({ name: "loading" });
    try {
      const { result } = await api("lookup", { body: mode === "rego" ? { rego, state } : { vin } });
      setPhase({ name: "found", result });
    } catch (error) {
      if (error.code === "signed_out") onError(error);
      setPhase({ name: "error", error });
    }
  }
  function use(result) {
    const car = blankCar();
    const fields = result?.fields || {};
    Object.assign(car, fields, { year: fields.year ?? "" });
    if (mode === "rego") {
      car.rego = query;
      car.state = state;
    } else car.vin = fields.vin || query;
    if (!car.fuel) car.fuel = "Petrol";
    if (result)
      car.lookup = {
        provider: result.provider,
        at: result.at,
        description: result.description,
        query: mode === "rego" ? `${query} (${state})` : `VIN ${query}`,
        filled: Object.keys(fields),
        missing: result.missing,
      };
    onUse(car);
  }

  return (
    <section className="sa-find">
      <button type="button" className="sa-back" onClick={onCancel}>
        <ArrowLeft size={16} aria-hidden="true" /> Stock
      </button>
      <h1 tabIndex={-1} ref={ref}>
        Add a car
      </h1>
      <p className="sa-lead">
        {lookupReady
          ? "Enter the rego and the state it's registered in. The details fill themselves in."
          : "Rego lookup isn't connected yet, so you'll type the details in."}
      </p>
      <form className="sa-panel sa-find-form" onSubmit={find}>
        <div className="sa-segmented" role="radiogroup" aria-label="Find by">
          {[
            ["rego", "Rego"],
            ["vin", "VIN"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={mode === key}
              className={mode === key ? "is-selected" : ""}
              onClick={() => {
                setMode(key);
                setPhase({ name: "idle" });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "rego" ? (
          <>
            <label className="sa-field sa-plate-field">
              <span>Rego</span>
              <input
                className="sa-plate"
                value={rego}
                onChange={(event) => setRego(event.target.value.toUpperCase())}
                placeholder="S123ABC"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={10}
                required
              />
            </label>
            <fieldset className="sa-states">
              <legend>Registered in</legend>
              <div>
                {STATES.map((code) => (
                  <label key={code} className={state === code ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="state"
                      value={code}
                      checked={state === code}
                      onChange={() => setState(code)}
                    />
                    {code}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <label className="sa-field">
            <span>VIN (17 characters, usually on the windscreen or door pillar)</span>
            <input
              className="sa-vin"
              value={vin}
              onChange={(event) => setVin(event.target.value.toUpperCase())}
              placeholder="6G1FK5EP0GL303518"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={24}
              required
            />
          </label>
        )}
        {already && (
          <p className="sa-already">
            Already in your stock: <b>{title(already)}</b> ({STATUS_TEXT[already.status].toLowerCase()}).{" "}
            <button type="button" className="sa-link" onClick={() => onOpen(already.id)}>
              Open it
            </button>
          </p>
        )}
        {lookupReady ? (
          <button className="sa-button is-primary is-wide" disabled={phase.name === "loading" || !query}>
            {phase.name === "loading" ? (
              <Loader2 className="sa-spin" size={16} aria-hidden="true" />
            ) : (
              <Search size={16} aria-hidden="true" />
            )}
            {phase.name === "loading" ? "Looking it up…" : "Find the car"}
          </button>
        ) : (
          <button type="button" className="sa-button is-primary is-wide" onClick={() => use(null)}>
            Enter the details <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
        {lookupReady && (
          <p className="sa-hint">
            {credits != null ? `${credits} lookups left. ` : ""}Each new rego costs one lookup; looking up the same car
            again within 30 days is free.
          </p>
        )}
      </form>

      {phase.name === "found" && (
        <LookupResult result={phase.result} refFocus={resultRef} onUse={() => use(phase.result)} />
      )}
      {phase.name === "error" && (
        <div className="sa-panel sa-result is-error" tabIndex={-1} ref={resultRef}>
          <h2>
            {phase.error.code === "not_found"
              ? `No match for ${mode === "rego" ? `${query} in ${state}` : "that VIN"}`
              : phase.error.code === "credits"
                ? "Out of lookups"
                : "The lookup didn't work"}
          </h2>
          <p>
            {phase.error.code === "not_found"
              ? "Check the rego and the state. New plates can take a few days to appear. You can also enter the details yourself."
              : phase.error.code === "credits"
                ? "The rego lookup account has run out of credits. Top it up at carregistrationapi.com.au, or enter the details yourself for now."
                : phase.error.message}
          </p>
          <div className="sa-row">
            <button type="button" className="sa-button is-secondary" onClick={() => use(null)}>
              Enter the details yourself
            </button>
          </div>
        </div>
      )}
      <button type="button" className="sa-link sa-skip" onClick={() => use(null)}>
        No rego or VIN? Enter the details yourself
      </button>
    </section>
  );
}

function LookupResult({ result, refFocus, onUse }) {
  const rows = [
    ...Object.entries(result.fields).filter(([key]) => !["year", "make", "model"].includes(key)),
    ...Object.entries(result.extra || {}),
  ].map(([key, value]) => [LABELS[key] || key, key === "regoExpiry" ? formatDate(value) : value]);
  const heading = [result.fields.year, result.fields.make, result.fields.model].filter(Boolean).join(" ");
  return (
    <div className="sa-panel sa-result" tabIndex={-1} ref={refFocus}>
      <p className="sa-kicker">
        <Check size={14} aria-hidden="true" /> Found{result.cached ? " (saved lookup, no charge)" : ""}
      </p>
      <h2>{heading || result.description || "Vehicle found"}</h2>
      {result.description && heading && <p className="sa-record">Rego record: {result.description}</p>}
      {result.warnings.map((warning) => (
        <p key={warning} className="sa-warning" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> {warning}
        </p>
      ))}
      {rows.length > 0 && (
        <dl className="sa-facts">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {result.missing.length > 0 && (
        <p className="sa-missing">
          Not in the rego record: {result.missing.map((key) => (LABELS[key] || key).toLowerCase()).join(", ")}. You'll
          add {result.missing.length === 1 ? "it" : "these"} next.
        </p>
      )}
      <button type="button" className="sa-button is-primary is-wide" onClick={onUse}>
        Use these details <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// --- Edit a car --------------------------------------------------------------

function EditCar({ initial, isNew, version, onSaved, onDeleted, onCancel, onError }) {
  const [car, setCar] = useState(initial);
  const [baseline] = useState(() => JSON.stringify(fromForm(initial)));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef(null);
  const allowLeave = useRef(false);
  const ref = useFocusOnChange(initial.id || "new");
  const live = initial.status !== "draft";
  const filled = new Set(car.lookup?.filled || []);
  const uploading = car.photos.some((photo) => photo.state === "processing" || photo.state === "uploading");
  const dirty = JSON.stringify(fromForm(car)) !== baseline || isNew;

  // Keep unsaved changes from being lost to a stray tap, swipe or the back
  // button.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowLeave.current && currentLocation.search !== nextLocation.search,
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Leave without saving? Your changes to this car will be lost.")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (key) => (event) => setCar((current) => ({ ...current, [key]: event.target.value }));
  const field = (key, label, props = {}) => (
    <label className={`sa-field${props.wide ? " is-wide" : ""}`}>
      <span>
        {label}
        {filled.has(key) && <em className="sa-from"> from rego</em>}
        {props.required && <i aria-hidden="true"> *</i>}
      </span>
      <input value={car[key] ?? ""} onChange={set(key)} {...{ ...props, wide: undefined }} />
    </label>
  );
  const select = (key, label, options, props = {}) => (
    <label className="sa-field">
      <span>
        {label}
        {filled.has(key) && <em className="sa-from"> from rego</em>}
      </span>
      <select value={car[key] ?? ""} onChange={set(key)} {...props}>
        <option value="">Choose…</option>
        {car[key] && !options.includes(car[key]) && <option value={car[key]}>{car[key]}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );

  async function addPhotos(files) {
    const list = [...files].slice(0, 40 - car.photos.length);
    const entries = list.map((file) => ({ id: newPhotoId(), state: "processing", name: file.name, file }));
    setCar((current) => ({ ...current, photos: [...current.photos, ...entries] }));
    const update = (id, patch) =>
      setCar((current) => ({
        ...current,
        photos: current.photos.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)),
      }));
    // One at a time: phones run out of memory decoding several big photos.
    for (const entry of entries) {
      try {
        const prepared = await preparePhoto(entry.file);
        update(entry.id, { state: "uploading", preview: prepared.preview });
        const form = new FormData();
        form.append("id", entry.id);
        form.append("width", String(prepared.width));
        form.append("height", String(prepared.height));
        for (const [name, blob] of prepared.files) form.append(name, blob, `${name}.${blob.type.split("/")[1]}`);
        const { photo } = await api("photo", { form });
        update(entry.id, { ...photo, state: "ready", file: undefined });
      } catch (failure) {
        if (failure.code === "signed_out") onError(failure);
        update(entry.id, { state: "error", error: failure.message, file: undefined });
      }
    }
  }
  const movePhoto = (index, step) =>
    setCar((current) => {
      const photos = [...current.photos];
      const [photo] = photos.splice(index, 1);
      photos.splice(Math.max(0, Math.min(photos.length, index + step)), 0, photo);
      return { ...current, photos };
    });
  const removePhoto = (id) =>
    setCar((current) => ({ ...current, photos: current.photos.filter((photo) => photo.id !== id) }));

  async function save(status) {
    setBusy(status);
    setError("");
    try {
      const data = await api("save", { body: { car: fromForm({ ...car, status }), expectedVersion: version } });
      const message =
        data.publish?.message ||
        (status === "draft" ? "Draft saved. It isn't on the website yet." : "Saved.");
      allowLeave.current = true;
      onSaved(data, { tone: data.publish?.state === "failed" ? "error" : "ok", text: message });
    } catch (failure) {
      if (failure.code === "invalid") setError(failure.message);
      else onError(failure);
      setBusy("");
    }
  }
  async function remove() {
    setBusy("delete");
    try {
      const data = await api("delete", { body: { id: car.id, expectedVersion: version } });
      allowLeave.current = true;
      onDeleted(data);
    } catch (failure) {
      onError(failure);
      setBusy("");
      setConfirmDelete(false);
    }
  }
  const leave = () => onCancel();

  return (
    <section className="sa-edit">
      <button type="button" className="sa-back" onClick={leave}>
        <ArrowLeft size={16} aria-hidden="true" /> Stock
      </button>
      <div className="sa-edit-head">
        <h1 tabIndex={-1} ref={ref}>
          {title(car)}
        </h1>
        <span className={`sa-status is-${initial.status}`}>{isNew ? "New" : STATUS_TEXT[initial.status]}</span>
      </div>
      {car.lookup && (
        <p className="sa-banner">
          Filled in from the rego record for {car.lookup.query}. Check everything before it goes on the website
          {car.lookup.missing?.length ? `, and add the ${car.lookup.missing.map((key) => (LABELS[key] || key).toLowerCase()).join(", ")}` : ""}.
        </p>
      )}
      {initial.importedFrom && initial.status === "draft" && (
        <p className="sa-banner is-warn">
          Copied from the old sample listing. The photos are real, but check the price, kilometres and specifications.
        </p>
      )}

      <form
        className="sa-form"
        onSubmit={(event) => {
          event.preventDefault();
          save(live ? initial.status : "available");
        }}
      >
        <fieldset className="sa-panel">
          <legend>Photos</legend>
          <p className="sa-hint">The first photo is the cover. Landscape photos look best. Up to 40.</p>
          <ul className="sa-photos">
            {car.photos.map((photo, index) => (
              <li key={photo.id} className={`is-${photo.state}`}>
                <div className="sa-photo">
                  {photo.preview || photo.src ? <img src={photo.preview || thumbnail(photo)} alt="" /> : null}
                  {index === 0 && photo.state === "ready" && <span className="sa-cover">Cover</span>}
                  {(photo.state === "processing" || photo.state === "uploading") && (
                    <span className="sa-photo-state">
                      <Loader2 className="sa-spin" size={18} aria-hidden="true" />
                      {photo.state === "processing" ? "Preparing" : "Uploading"}
                    </span>
                  )}
                  {photo.state === "error" && (
                    <span className="sa-photo-state is-error" title={photo.error}>
                      <AlertTriangle size={18} aria-hidden="true" /> Didn't upload
                    </span>
                  )}
                </div>
                <div className="sa-photo-actions">
                  <button
                    type="button"
                    aria-label={`Move photo ${index + 1} earlier`}
                    disabled={index === 0}
                    onClick={() => movePhoto(index, -1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move photo ${index + 1} later`}
                    disabled={index === car.photos.length - 1}
                    onClick={() => movePhoto(index, 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(photo.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
                {photo.state === "error" && <p className="sa-photo-error">{photo.error}</p>}
              </li>
            ))}
            {car.photos.length < 40 && (
              <li>
                <button type="button" className="sa-add-photo" onClick={() => fileInput.current?.click()}>
                  <ImagePlus size={24} aria-hidden="true" />
                  Add photos
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  aria-label="Add photos"
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
              </li>
            )}
          </ul>
        </fieldset>

        <fieldset className="sa-panel sa-grid">
          <legend>The car</legend>
          {field("year", "Year", { inputMode: "numeric", pattern: "[0-9]*", maxLength: 4, required: true })}
          <label className="sa-field">
            <span>
              Make{filled.has("make") && <em className="sa-from"> from rego</em>}
              <i aria-hidden="true"> *</i>
            </span>
            <input value={car.make} onChange={set("make")} list="sa-makes" required maxLength={40} />
            <datalist id="sa-makes">
              {MAKES.map((make) => (
                <option key={make} value={make} />
              ))}
            </datalist>
          </label>
          {field("model", "Model", { required: true, maxLength: 40, placeholder: "GTS" })}
          {field("variant", "Variant or badge", { maxLength: 80, placeholder: "Gen-F2 · Supercharged sedan", wide: true })}
          {select("body", "Body", BODIES)}
          {field("colour", "Colour", { maxLength: 30 })}
          {select("transmission", "Gearbox", TRANSMISSIONS)}
          {field("engine", "Engine", { maxLength: 60, placeholder: "6.2L supercharged V8", wide: true })}
          {select("fuel", "Fuel", FUELS)}
          {field("power", "Power", { maxLength: 20, placeholder: "430 kW" })}
          {field("kms", "Kilometres", { inputMode: "numeric", maxLength: 9, required: true })}
        </fieldset>

        <fieldset className="sa-panel sa-grid">
          <legend>Price and listing</legend>
          <label className="sa-field">
            <span>
              Price ($)<i aria-hidden="true"> *</i>
            </span>
            <input value={car.price} onChange={set("price")} inputMode="numeric" maxLength={10} required={car.status !== "sold"} />
          </label>
          <label className="sa-field">
            <span>Tag on the photo (optional)</span>
            <input value={car.tag} onChange={set("tag")} list="sa-tags" maxLength={28} placeholder="JUST ARRIVED" />
            <datalist id="sa-tags">
              {TAGS.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </label>
          <label className="sa-field is-wide">
            <span>Description</span>
            <textarea
              value={car.description}
              onChange={set("description")}
              rows={5}
              maxLength={3000}
              placeholder="What makes this car special: history, service records, options, condition."
            />
          </label>
        </fieldset>

        <fieldset className="sa-panel sa-grid">
          <legend>Registration</legend>
          <p className="sa-hint is-wide">Kept private: none of this shows on the website.</p>
          {field("rego", "Rego", { maxLength: 9, autoCapitalize: "characters", spellCheck: false })}
          <label className="sa-field">
            <span>State</span>
            <select value={car.state} onChange={set("state")}>
              <option value="">Not registered</option>
              {STATES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          {field("regoExpiry", "Rego expires", { type: "date" })}
          {field("vin", "VIN", { maxLength: 20, autoCapitalize: "characters", spellCheck: false })}
          {field("stock", "Stock number", { maxLength: 12, placeholder: "Automatic" })}
        </fieldset>

        {error && (
          <p className="sa-error sa-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="sa-actions">
          {uploading && (
            <p className="sa-hint">
              <Loader2 className="sa-spin" size={14} aria-hidden="true" /> Waiting for photos to upload…
            </p>
          )}
          <div className="sa-row">
            {!live && (
              <button type="button" className="sa-button is-secondary" disabled={Boolean(busy) || uploading} onClick={() => save("draft")}>
                {busy === "draft" && <Loader2 className="sa-spin" size={15} aria-hidden="true" />}
                Save draft
              </button>
            )}
            {initial.status === "available" && (
              <button type="button" className="sa-button is-secondary" disabled={Boolean(busy) || uploading} onClick={() => save("sold")}>
                {busy === "sold" && <Loader2 className="sa-spin" size={15} aria-hidden="true" />}
                Mark as sold
              </button>
            )}
            {initial.status === "sold" && (
              <button type="button" className="sa-button is-secondary" disabled={Boolean(busy) || uploading} onClick={() => save("available")}>
                {busy === "available" && <Loader2 className="sa-spin" size={15} aria-hidden="true" />}
                Back on sale
              </button>
            )}
            <button className="sa-button is-primary" disabled={Boolean(busy) || uploading}>
              {busy && busy === (live ? initial.status : "available") && (
                <Loader2 className="sa-spin" size={15} aria-hidden="true" />
              )}
              {live ? "Save changes" : "Put on the website"}
            </button>
          </div>
          {!isNew && (
            <div className="sa-delete">
              {confirmDelete ? (
                <p role="alert">
                  Delete {title(car)} and its photos{live ? " from the website" : ""}? This can't be undone.{" "}
                  <button type="button" className="sa-button is-danger" onClick={remove} disabled={busy === "delete"}>
                    {busy === "delete" && <Loader2 className="sa-spin" size={15} aria-hidden="true" />}
                    Delete
                  </button>{" "}
                  <button type="button" className="sa-link" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </p>
              ) : (
                <button type="button" className="sa-link is-danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} aria-hidden="true" /> Delete this car
                </button>
              )}
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
