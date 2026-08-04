const puppeteer = require("puppeteer-core");
const fs = require("fs");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE = "<PROJECT_DIR>\\config\\gb_browser_profile";
const COOKIES_FILE = "<PROJECT_DIR>\\config\\gamebanana_cookies.txt";
const MOD_URL = "https://gamebanana.com/mods/700107";
const LOGIN_URL = "https://gamebanana.com/members/account/login";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log("== 启动有头 Edge(复用 profile)==");
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    userDataDir: PROFILE,
    headless: false,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--window-size=1280,900"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");

  // 先检查是否已登录(独立探测页,不动用户页面)
  const probe = await browser.newPage();
  await probe.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
  let loggedIn = false;
  try {
    await probe.goto(MOD_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);
    const links = await probe.evaluate(() =>
      [...document.querySelectorAll("a")].filter(a => /edit/i.test(a.href) && /700107/.test(a.href)).map(a => a.href)
    );
    if (links.length) loggedIn = true;
  } catch (e) { /* ignore */ }

  if (!loggedIn) {
    console.log("== 打开登录页,请在浏览器窗口手动登录 ==");
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("登录页已打开。请手动登录,完成后脚本自动检测(不打扰你的页面)...");

    // 轮询 cookies,不导航任何页面
    let sessSeen = false;
    for (let i = 0; i < 180; i++) { // 最长 15 分钟
      await sleep(5000);
      const cookies = await page.cookies("https://gamebanana.com");
      const sess = cookies.find(c => c.name === "sess");
      if (sess && sess.value) { sessSeen = true; console.log("== 检测到 sess cookie,等待", (i + 1) * 5, "秒 =="); break; }
      if (i % 12 === 11) console.log("...仍在等待登录(" + Math.round((i + 1) * 5 / 60) + " 分钟)");
    }
    if (!sessSeen) { console.log("LOGIN_TIMEOUT: 15 分钟未检测到登录"); await browser.close(); process.exit(1); }
  } else {
    console.log("== 已经是登录状态 ==");
  }

  // 用独立探测页验证 edit 链接 + 保存 cookies
  await probe.goto(MOD_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(2000);
  const editLinks = await probe.evaluate(() =>
    [...document.querySelectorAll("a")].filter(a => /edit/i.test(a.href) && /700107/.test(a.href)).map(a => a.href)
  );
  console.log("EDIT LINKS:", JSON.stringify(editLinks));

  const cookies = await probe.cookies("https://gamebanana.com");
  const keep = ["sess", "rmc", "cf_clearance"];
  const parts = cookies.filter(c => keep.includes(c.name)).map(c => c.name + "=" + c.value);
  fs.writeFileSync(COOKIES_FILE, parts.join("; "));
  console.log("== cookies 已保存到", COOKIES_FILE, "==");

  // 探测编辑页结构(只读,不发布)
  console.log("== 打开编辑页探测结构 ==");
  await probe.goto("https://gamebanana.com/mods/700107/edit", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(4000);
  console.log("EDIT URL:", probe.url());
  console.log("EDIT TITLE:", await probe.title());

  const structure = await probe.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")].map(i => ({ id: i.id, name: i.name, type: i.type, value: (i.value || "").slice(0, 60) }))
      .filter(i => i.type !== "checkbox" && i.type !== "hidden");
    const fileInputs = [...document.querySelectorAll("input[type=file]")].map(i => ({ id: i.id, name: i.name, accept: i.accept || "" }));
    const buttons = [...document.querySelectorAll("button, input[type=submit]")].map(b => ((b.innerText || b.value || "").trim()).slice(0, 60)).filter(Boolean).slice(0, 20);
    const textareas = [...document.querySelectorAll("textarea")].map(t => ({ id: t.id, name: t.name, len: (t.value || "").length })).slice(0, 10);
    const selects = [...document.querySelectorAll("select")].map(s => ({ id: s.id, name: s.name })).slice(0, 10);
    const versionFields = [...document.querySelectorAll("input, select")].filter(el => /version|ver/i.test(el.id + " " + (el.name || ""))).map(el => ({ tag: el.tagName, id: el.id, name: el.name, value: el.value }));
    return { inputs, fileInputs, buttons, textareas, selects, versionFields };
  });
  console.log("EDIT STRUCTURE:", JSON.stringify(structure, null, 1));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
