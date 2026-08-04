const puppeteer = require("puppeteer-core");
const fs = require("fs");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE = "F:\\BabelTower\\config\\gb_browser_profile";
const COOKIES_FILE = "F:\\BabelTower\\config\\gamebanana_cookies.txt";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    userDataDir: PROFILE,
    headless: "new",
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");

  const cookieStr = fs.readFileSync(COOKIES_FILE, "utf8").trim();
  await page.goto("https://gamebanana.com", { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(1500);
  for (const p of cookieStr.split(";").map(s => s.trim()).filter(Boolean)) {
    const idx = p.indexOf("=");
    if (idx <= 0) continue;
    try { await page.setCookie({ name: p.slice(0, idx), value: p.slice(idx + 1), domain: ".gamebanana.com", path: "/", httpOnly: false, secure: false }); } catch (e) {}
  }

  // 直接访问 mod 主页(游客视角)
  await page.goto("https://gamebanana.com/mods/700107", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(4000);

  const check = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      hasAI: /AI-Assisted Development Disclosure/i.test(text),
      aiContext: (text.match(/AI-Assisted Development Disclosure[^\n]{0,200}/) || [""])[0],
      hasOpenClaw: /OpenClaw/i.test(text),
      version: (text.match(/Version[:\s]*([0-9.]+)/i) || [])[1] || "?",
      fileNames: [...document.querySelectorAll("a")].filter(a => /\.zip/i.test(a.href)).slice(0, 3).map(a => a.href),
    };
  });
  console.log("VERIFY:", JSON.stringify(check, null, 1));

  // 也通过 API 验证(不带 cookies,游客)
  const https = require("https");
  await new Promise((resolve) => {
    const req = https.request("https://gamebanana.com/apiv11/Mod/700107/ProfilePage", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try {
          const j = JSON.parse(d);
          const desc = (j._aProfileData || {})._sText || (j._sDescription || "");
          console.log("API DESC HAS AI:", /AI-Assisted Development Disclosure/i.test(desc));
          console.log("API VERSION:", j._sVersion || "?");
          const files = j._aFiles || [];
          console.log("API FILES:", files.map(f => `${f._idRow}:${f._sFile}(${f._nFilesize})`).join(" | "));
        } catch (e) { console.log("API ERR:", e.message); }
        resolve();
      });
    });
    req.on("error", (e) => { console.log("API ERR:", e.message); resolve(); });
    req.setTimeout(15000, () => { req.destroy(); resolve(); });
    req.end();
  });

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
