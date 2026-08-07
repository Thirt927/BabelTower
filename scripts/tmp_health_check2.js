const http = require("http");
function get(path, cb) {
  const req = http.get({ host: "127.0.0.1", port: 8791, path, timeout: 4000 }, (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => cb(res.statusCode, d));
  });
  req.on("error", (e) => cb(null, "ERR: " + e.message));
  req.on("timeout", () => { req.destroy(new Error("timeout")); cb(null, "ERR: timeout"); });
}
get("/", (sc, d) => console.log("GET / ->", sc, JSON.stringify(String(d).slice(0, 200))));
get("/api/health", (sc, d) => console.log("GET /api/health ->", sc, JSON.stringify(String(d).slice(0, 200))));
get("/health", (sc, d) => console.log("GET /health ->", sc, JSON.stringify(String(d).slice(0, 200))));
