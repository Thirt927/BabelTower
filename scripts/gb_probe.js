const puppeteer = require("puppeteer-core");
const path = require("path");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE = "F:\\BabelTower\\config\\gb_browser_profile";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    userDataDir: PROFILE,
    headless: "new",
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");

  // 1. 先访问主页确认登录态
  await page.goto("https://gamebanana.com", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  const title = await page.title();
  console.log("HOME TITLE:", title);

  // 找登录指示
  const loginState = await page.evaluate(() => {
    const body = document.body.innerText || "";
    const hasSignIn = /sign in|log in/i.test(body.slice(0, 2000));
    const memberLinks = [...document.querySelectorAll("a")].filter(a => /\/members\/\d+/.test(a.href)).slice(0, 3).map(a => a.href);
    return { hasSignIn, memberLinks };
  });
  console.log("LOGIN STATE:", JSON.stringify(loginState));

  // 2. 访问 mod 页面
  await page.goto("https://gamebanana.com/mods/700107", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  const modTitle = await page.title();
  console.log("MOD TITLE:", modTitle);

  // 找 Edit 按钮
  const editBtn = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a")].filter(a => /edit/i.test(a.href) && /700107/.test(a.href));
    return links.map(a => ({ href: a.href, text: (a.innerText || "").trim().slice(0, 40) }));
  });
  console.log("EDIT LINKS:", JSON.stringify(editBtn));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
