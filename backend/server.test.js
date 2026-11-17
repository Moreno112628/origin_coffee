const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer, products } = require("./server");

const server = createServer();
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint reports that the API is ready", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("catalog endpoint returns the illustrative products", async () => {
  const response = await fetch(`${baseUrl}/api/products`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.products, products);
  assert.ok(body.products.length > 0);
});

test("contact endpoint rejects invalid submissions", async () => {
  const response = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Ana", email: "not-an-email", message: "Hola" }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /correo electrónico válido/);
});

test("contact endpoint accepts valid submissions with a temporary-storage notice", async () => {
  const response = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ana",
      email: "ana@example.com",
      message: "Quiero conocer el catálogo.",
    }),
  });

  assert.equal(response.status, 202);
  assert.match((await response.json()).message, /se perderá al detener el servidor/);
});

test("website is served from the frontend directory", async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Origin Coffee/);
});
