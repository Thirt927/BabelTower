const puppeteer = require("puppeteer-core");
const fs = require("fs");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE = "<PROJECT_DIR>\\config\\gb_browser_profile";
const cookieStr = fs.readFileSync("F:/BabelTower/config/gamebanana_cookies.txt", "utf8").trim();

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    userDataDir: PROFILE,
    headless: "new",
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");

  // 先访问域名建立 origin,再注入 cookies
  await page.goto("https://gamebanana.com", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 2000));

  // 解析 cookie 字符串并注入
  const pairs = cookieStr.split(";").map(s => s.trim()).filter(Boolean);
  for (const p of pairs) {
    const idx = p.indexOf("=");
    if (idx <= 0) continue;
    const name = p.slice(0, idx);
    const value = p.slice(idx + 1);
    try {
      await page.setCookie({ name, value, domain: ".gamebanana.com", path: "/", httpOnly: false, secure: false });
      console.log("SET:", name);
    } catch (e) {
      console.log("SET FAIL:", name, e.message);
    }
  }

  // 刷新,检查登录态
  await page.goto("https://gamebanana.com", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  const state = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a,button")].filter(el => /log in|sign in|register/i.test(el.innerText || ""));
    const members = [...document.querySelectorAll("a")].filter(a => /\/members\/\d+/.test(a.href) && (a.innerText || "").trim().length > 0 && (a.innerText || "").trim().length < 30).slice(0, 5).map(a => ({ t: a.innerText.trim(), h: a.href }));
    return { loginBtns: links.length, memberLinks: members };
  });
  console.log("LOGIN STATE:", JSON.stringify(state));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
