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

  // 注入 cookies
  const cookieStr = fs.readFileSync(COOKIES_FILE, "utf8").trim();
  await page.goto("https://gamebanana.com", { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(1500);
  for (const p of cookieStr.split(";").map(s => s.trim()).filter(Boolean)) {
    const idx = p.indexOf("=");
    if (idx <= 0) continue;
    try { await page.setCookie({ name: p.slice(0, idx), value: p.slice(idx + 1), domain: ".gamebanana.com", path: "/", httpOnly: false, secure: false }); } catch (e) {}
  }

  // 正确的编辑 URL
  await page.goto("https://gamebanana.com/mods/edit/700107", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(5000);
  console.log("EDIT URL:", page.url());
  console.log("EDIT TITLE:", await page.title());

  const structure = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")].map(i => ({ id: i.id, name: i.name, type: i.type, value: (i.value || "").slice(0, 80) }))
      .filter(i => i.type !== "checkbox" && i.type !== "hidden" && i.type !== "radio");
    const hidden = [...document.querySelectorAll("input[type=hidden]")].map(i => ({ id: i.id, name: i.name, value: (i.value || "").slice(0, 60) }));
    const fileInputs = [...document.querySelectorAll("input[type=file]")].map(i => ({ id: i.id, name: i.name, accept: i.accept || "" }));
    const buttons = [...document.querySelectorAll("button, input[type=submit]")].map(b => ((b.innerText || b.value || "").trim()).slice(0, 60)).filter(Boolean).slice(0, 25);
    const textareas = [...document.querySelectorAll("textarea")].map(t => ({ id: t.id, name: t.name, len: (t.value || "").length })).slice(0, 10);
    const selects = [...document.querySelectorAll("select")].map(s => ({ id: s.id, name: s.name })).slice(0, 10);
    const versionFields = [...document.querySelectorAll("input, select")].filter(el => /version|ver/i.test(el.id + " " + (el.name || ""))).map(el => ({ tag: el.tagName, id: el.id, name: el.name, value: el.value }));
    return { inputs, hidden, fileInputs, buttons, textareas, selects, versionFields };
  });
  console.log("EDIT STRUCTURE:", JSON.stringify(structure, null, 1));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
