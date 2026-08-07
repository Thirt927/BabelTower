const http = require("http");
const body = JSON.stringify({ text: "hello team", sourceLanguage: "auto", targetLanguage: "zh-Hans", timeoutMs: 15000 });
const req = http.request({ host: "127.0.0.1", port: 8791, path: "/api/v1/translate", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: 20000 }, (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => console.log("translate ->", res.statusCode, JSON.stringify(String(d).slice(0, 400))));
});
req.on("error", (e) => console.log("ERR:", e.message));
req.on("timeout", () => { req.destroy(new Error("timeout")); });
req.write(body);
req.end();

const h = http.get({ host: "127.0.0.1", port: 8791, path: "/api/v1/health", timeout: 4000 }, (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => console.log("health ->", res.statusCode, String(d).slice(0, 200)));
});
h.on("error", (e) => console.log("health ERR:", e.message));
