// Turns the dev server's Node requests into web-standard Requests and sends
// web-standard Responses back, so the API handlers run unchanged in Vite and
// on Vercel.
export async function toRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers))
    if (!name.startsWith(":") && value != null) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  const hasBody = !["GET", "HEAD"].includes(req.method) && chunks.length;
  return new Request(`http://${req.headers.host || "localhost"}${req.url}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });
}
export async function send(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
