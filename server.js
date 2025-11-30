import { createServer } from "http";
import next from "next";

const dev = false;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({
  dev,
  hostname,
  port,
  dir: ".", // IMPORTANT
  conf: {}, // REQUIRED FOR Next 15
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
    console.log("Running on port", port);
  });
});
