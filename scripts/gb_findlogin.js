const puppeteer = require("puppeteer-core");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE = "<PROJECT_DIR>\\config\\gb_browser_profile";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    userDataDir: PROFILE,
    headless: "new",
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");

  // 找登录入口
  await page.goto("https://gamebanana.com/mods/700107/edit", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));
  console.log("URL after /edit:", page.url());
  console.log("TITLE:", await page.title());

  // 找登录按钮/链接
  const loginInfo = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a,button")].filter(el => /log in|sign in/i.test(el.innerText || "")).map(el => ({ tag: el.tagName, text: (el.innerText || "").trim(), href: el.href || "" }));
    return links.slice(0, 5);
  });
  console.log("LOGIN LINKS:", JSON.stringify(loginInfo));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
