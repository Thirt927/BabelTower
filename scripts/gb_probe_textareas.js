const puppeteer = require("puppeteer-core");
const fs = require("fs");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE = "<PROJECT_DIR>\\config\\gb_browser_profile";
const COOKIES_FILE = "<PROJECT_DIR>\\config\\gamebanana_cookies.txt";

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

  await page.goto("https://gamebanana.com/mods/edit/700107", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(4000);

  // 输出所有 textarea 的 name/id + 内容前 300 字符
  const areas = await page.evaluate(() => {
    return [...document.querySelectorAll("textarea")].map((t, i) => ({
      idx: i,
      id: t.id,
      name: t.name,
      len: (t.value || "").length,
      head: (t.value || "").slice(0, 300),
    }));
  });
  console.log(JSON.stringify(areas, null, 1));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
