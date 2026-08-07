const http = require("http");
const req = http.get({ host: "127.0.0.1", port: 8791, path: "/health", timeout: 5000 }, (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => {
    console.log("health:", res.statusCode, d);
  });
});
req.on("error", (e) => console.log("bridge DOWN:", e.message));
req.on("timeout", () => { req.destroy(new Error("timeout")); });
