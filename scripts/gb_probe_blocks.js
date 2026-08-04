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

  // 分析文件区块:每个文件区(file input + caption + version + desc + idFileRow)的 DOM 关系
  const fileBlocks = await page.evaluate(() => {
    const blocks = [];
    // 找所有包含 _idFileRow 的表单区块
    const allInputs = [...document.querySelectorAll("input")];
    const fileInputs = allInputs.filter(i => i.type === "file");
    const idFileRows = allInputs.filter(i => i.name === "_idFileRow");
    const versions = allInputs.filter(i => i.name === "_sVersion" && i.type === "text");
    const captions = allInputs.filter(i => i.name === "_sCaption");
    const descs = allInputs.filter(i => i.name === "_sDescription" && i.type === "text");

    // 用 DOM 祖先关系:每个 file input 往上找最近的 section/div 容器
    function getContainer(el) {
      let n = el;
      while (n && n.tagName !== "FORM" && n.tagName !== "BODY") {
        // 找包含 _idFileRow 的最近祖先
        if (n.querySelector && n.querySelector('input[name="_idFileRow"]')) return n;
        n = n.parentElement;
      }
      return null;
    }

    for (const fi of fileInputs) {
      const container = getContainer(fi);
      const info = { fileInputId: fi.id, fileInputName: fi.name };
      if (container) {
        const row = container.querySelector('input[name="_idFileRow"]');
        const ver = container.querySelector('input[name="_sVersion"]');
        const cap = container.querySelector('input[name="_sCaption"]');
        const desc = container.querySelector('input[name="_sDescription"]');
        info.idFileRow = row ? row.value : null;
        info.version = ver ? ver.value : null;
        info.caption = cap ? cap.value : null;
        info.desc = desc ? desc.value : null;
        info.containerTag = container.tagName + (container.className ? "." + String(container.className).slice(0, 40) : "");
      }
      blocks.push(info);
    }
    return blocks;
  });
  console.log("FILE BLOCKS:", JSON.stringify(fileBlocks, null, 1));

  // 保存按钮信息
  const saveBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button, input[type=submit], a")].filter(b => /save/i.test((b.innerText || b.value || "").trim()));
    return btns.map(b => ({ tag: b.tagName, text: (b.innerText || b.value || "").trim(), id: b.id, name: b.name, type: b.type || "", form: b.form ? b.form.id : "" }));
  });
  console.log("SAVE BTNS:", JSON.stringify(saveBtn));

  await browser.close();
  console.log("DONE");
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
