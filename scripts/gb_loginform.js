const puppeteer = require("puppeteer-core");
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

  await page.goto("https://gamebanana.com/members/account/login", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log("LOGIN TITLE:", await page.title());

  const form = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")].map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder || "" }));
    const forms = [...document.querySelectorAll("form")].map(f => ({ action: f.action, id: f.id, method: f.method }));
    const buttons = [...document.querySelectorAll("button, input[type=submit]")].map(b => (b.innerText || b.value || "").trim()).filter(Boolean).slice(0, 8);
    // 第三方登录按钮
    const socials = [...document.querySelectorAll("a")].filter(a => /steam|google|discord|github|twitter/i.test(a.href)).map(a => ({ t: (a.innerText || "").trim(), h: a.href }));
    return { inputs, forms, buttons, socials };
  });
  console.log("FORM:", JSON.stringify(form, null, 1));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
