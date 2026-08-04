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

  await page.goto("https://gamebanana.com/mods/edit/700107", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(4000);

  // 打印所有含 _idFileRow 的元素上下文(找文件名显示)
  const ctx = await page.evaluate(() => {
    const out = [];
    const rows = [...document.querySelectorAll('input[name="_idFileRow"]')];
    rows.forEach((r, idx) => {
      const wrap = r.closest("div") || r.parentElement;
      const text = (wrap.innerText || "").slice(0, 200).replace(/\s+/g, " ");
      out.push({ idx, idFileRow: r.value, uploadReceipt: (wrap.querySelector('input[name="_sUploadReceiptId"]') || {}).value, text });
    });
    return out;
  });
  console.log("IDFILEROW CONTEXTS:", JSON.stringify(ctx, null, 1));

  // 文件区整体结构:找 "Files" 标题附近的 DOM
  const filesSection = await page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,legend,label,span")].filter(h => /files/i.test(h.innerText || "")).map(h => ({ tag: h.tagName, text: (h.innerText || "").slice(0, 60), cls: String(h.className).slice(0, 40) }));
    return headings.slice(0, 10);
  });
  console.log("FILES HEADINGS:", JSON.stringify(filesSection));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
