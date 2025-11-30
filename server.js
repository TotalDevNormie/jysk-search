const NextServer = require("next/dist/server/next-server").default;
const http = require("http");

const port = Number(process.env.PORT ?? 8080);

const app = new NextServer({
  hostname: "0.0.0.0",
  port,
  dir: ".",
  dev: process.env.NODE_ENV !== "production",
  conf: {}, // ← REQUIRED in Next.js 15
});

const handler = app.getRequestHandler();

http
  .createServer(async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  })
  .listen(port, "0.0.0.0", () => {
    console.log("Server running on port", port);
  });
