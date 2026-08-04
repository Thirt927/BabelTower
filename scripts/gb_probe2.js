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

  await page.goto("https://gamebanana.com", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));

  // 获取当前页面所有 gamebanana cookies
  const cookies = await page.cookies("https://gamebanana.com");
  console.log("COOKIES on gamebanana.com:");
  for (const c of cookies) {
    console.log(`  ${c.name} = ${(c.value || "").slice(0, 30)}... (expires: ${c.expires > 0 ? new Date(c.expires * 1000).toISOString() : "session"})`);
  }

  // 页面右上角用户区
  const userArea = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("a,button")].filter(el => /sign in|log in|register/i.test(el.innerText || "")).map(el => (el.innerText || "").trim().slice(0, 30));
    const imgs = [...document.querySelectorAll("img")].filter(i => i.src && i.src.includes("avatar")).slice(0, 3).map(i => i.src);
    return { btns, imgs };
  });
  console.log("USER AREA:", JSON.stringify(userArea));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
