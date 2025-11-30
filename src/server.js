const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 8080;
const hostname = "0.0.0.0";

const app = next({
  dev: false,
  hostname,
  port,
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Next.js running in FULL NODE SERVER mode on ${port}`);
  });
});
