// Babel Tower - lingua_chat.js 模拟测试器 v4
// 每个测试:独立面板树 + 先写配置再加载脚本(loadUiConfig 只在 boot 时读一次)
// 翻译走真实本地桥(127.0.0.1:8791)。用法: node lingua_chat_simtest.js
"use strict";

const http = require("http");
const path = require("path");

const SCRIPT = path.join(__dirname, "..", "mod", "panorama", "scripts", "lingua_chat.js");

// ---------------- Mock 面板 ----------------
let uid = 0;
class MockPanel {
  constructor(id, parent) {
    this._id = id || ("p" + (++uid));
    this._parent = parent || null;
    this._children = [];
    this._classes = new Set();
    this._deleted = false;
    this.text = "";
    this.title = "";
    this.style = { visibility: "visible" };
    this._attrs = {};
    this.__lctSig = undefined;
    this.__lctProcessed = false;
    this._submits = [];
  }
  IsValid() { return !this._deleted; }
  GetParent() { return this._parent; }
  GetChildCount() { return this._children.length; }
  GetChild(i) { return this._children[i] || null; }
  BHasClass(c) { return this._classes.has(c); }
  AddClass(c) { this._classes.add(c); }
  RemoveClass(c) { this._classes.delete(c); }
  GetAttributeString(k, def) { return this._attrs[k] !== undefined ? this._attrs[k] : def; }
  SetAttributeString(k, v) { this._attrs[k] = v; }
  DeleteAsync() {
    if (this._parent) {
      const i = this._parent._children.indexOf(this);
      if (i >= 0) this._parent._children.splice(i, 1);
    }
    this._deleted = true;
    this._parent = null;
  }
  FindChildTraverse(id) {
    if (this._id === id) return this;
    for (const c of this._children) {
      const r = c.FindChildTraverse(id);
      if (r) return r;
    }
    return null;
  }
  FindChildrenWithClassTraverse(cls) {
    const out = [];
    if (this._classes.has(cls)) out.push(this);
    for (const c of this._children) out.push(...c.FindChildrenWithClassTraverse(cls));
    return out;
  }
  addChild(panel) { panel._parent = this; this._children.push(panel); return panel; }
  setClass(...cs) { cs.forEach((c) => this._classes.add(c)); return this; }
}

// ---------------- 独立环境:面板树 + $ + 配置 + 模块加载 ----------------
function freshEnv(cfg) {
  delete require.cache[require.resolve(SCRIPT)];

  const contextPanel = new MockPanel("ContextPanel");
  const chatPanel = contextPanel.addChild(new MockPanel("Chat"));
  const messagesPanel = chatPanel.addChild(new MockPanel("ChatMessages"));
  const bridgePanel = contextPanel.addChild(new MockPanel("LCTBridgePanel"));

  bridgePanel.SetURL = function (url) {
    const q = new URL(url, "http://x").searchParams;
    const id = q.get("id") || "x";
    const text = q.get("text") || "";
    const source = q.get("source") || "auto";
    const target = q.get("target") || "zh-Hans";
    setTimeout(() => {
      if (bridgePanel._deleted) return;
      const body = JSON.stringify({ text, sourceLanguage: source, targetLanguage: target });
      const req = http.request({
        host: "127.0.0.1", port: 8791, path: "/api/v1/translate",
        method: "POST", headers: { "Content-Type": "application/json" }, timeout: 15000,
      }, (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          let payload = { ok: false, error: "bad_response" };
          try { payload = JSON.parse(data); } catch (e) {}
          bridgePanel.title = "LCT" + id + JSON.stringify(payload);
        });
      });
      req.on("error", () => { bridgePanel.title = "LCT" + id + JSON.stringify({ ok: false, error: "bridge_fetch_error" }); });
      req.write(body); req.end();
    }, 0);
  };

  contextPanel.SetAttributeString("lct_ui", JSON.stringify(cfg)); // UI_CONVAR = "lct_ui"

  globalThis.$ = {
    Msg: (...a) => console.log("[LCT-sim]", ...a),
    Schedule: (sec, fn) => setTimeout(fn, sec * 1000),
    CreatePanel: (type, parent, id) => parent.addChild(new MockPanel(id)).setClass(type === "Label" ? "Label" : type),
    RegisterForUnhandledEvent: () => {},
    DispatchEvent: () => {},
    GetContextPanel: () => contextPanel,
  };
  globalThis.Convars = { GetStr: () => "", RegisterConVar: () => {}, SetValue: () => {} };

  require(SCRIPT);

  return {
    contextPanel, messagesPanel,
    addRow(kind, sender, text, opts) {
      const row = new MockPanel(null).setClass("ChatMessage", "Expired");
      if (opts && opts.own) row.setClass("IsSelf");
      row.addChild(new MockPanel("SenderImage"));
      const body = row.addChild(new MockPanel(null).setClass("MessageBody"));
      const source = body.addChild(new MockPanel("MessageSource"));
      source.addChild(new MockPanel(null).setClass("ChannelName")).text = (opts && opts.channel) || "chat";
      source.addChild(new MockPanel(null).setClass("SenderName")).text = sender;
      const contents = body.addChild(new MockPanel("MessageContents"));
      if (kind === "ping") {
        contents.setClass("Ping");
        contents.addChild(new MockPanel("PingLabel")).text = text;
      } else {
        contents.setClass("Text");
        contents.addChild(new MockPanel(null)).text = text;
      }
      messagesPanel.addChild(row);
      return row;
    },
    recycleRow(row, kind, sender, text, opts) {
      const contents = row.FindChildTraverse("MessageContents");
      contents._children = [];
      contents._classes.clear();
      if (kind === "ping") {
        contents.setClass("Ping");
        contents.addChild(new MockPanel("PingLabel")).text = text;
      } else {
        contents.setClass("Text");
        contents.addChild(new MockPanel(null)).text = text;
      }
      const source = row.FindChildTraverse("MessageSource");
      const sn = source.FindChildrenWithClassTraverse("SenderName")[0];
      if (sn) sn.text = sender;
      if (opts && opts.own) row.setClass("IsSelf"); else row._classes.delete("IsSelf");
    },
    // 模拟玩家输入并回车(触发 handleChatSubmit)
    submitChat(text) {
      const input = contextPanel.FindChildTraverse("ChatTextEntry") || (() => {
        const c = chatPanel.addChild(new MockPanel("ChatTextEntry"));
        c.text = "";
        return c;
      })();
      input.text = text;
      $.DispatchEvent("TextEntrySubmit", input);
      return input;
    },
  };
}

const CFG = {
  translationOnly: { enabled: true, displayMode: "translation_only", targetLanguage: "zh-Hans", force: false, outgoing: "off", provider: "bing", timeoutMs: 15000 },
  bilingual: { enabled: true, displayMode: "bilingual", targetLanguage: "zh-Hans", force: false, outgoing: "off", provider: "bing", timeoutMs: 15000 },
  outgoingTranslation: { enabled: true, displayMode: "bilingual", targetLanguage: "zh-Hans", force: false, outgoing: "translation", outgoingTarget: "zh-Hans", provider: "bing", timeoutMs: 15000 },
};

// ---------------- 断言与工具 ----------------
let passCount = 0, failCount = 0;
function assert(name, cond, extra) {
  if (cond) { passCount++; console.log("  PASS " + name); }
  else { failCount++; console.log("  FAIL " + name + (extra ? "  [" + extra + "]" : "")); }
}
function bodyOf(row) {
  const found = row.FindChildrenWithClassTraverse("MessageBody");
  return found.length ? found[0] : null;
}
function labelsOf(row) {
  const body = bodyOf(row);
  return body ? body._children.filter((c) => c.BHasClass("LCTTranslation")) : [];
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(cond, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if (cond()) return true; } catch (e) {}
    await sleep(200);
  }
  return false;
}

// ---------------- 场景 ----------------
async function test1_injectAndCollapse() {
  console.log("\n[1] translation_only: english text -> label injected + original collapsed");
  const env = freshEnv(CFG.translationOnly);
  const row = env.addRow("text", "Alice", "hello can you push mid");
  const ok = await waitFor(() => labelsOf(row).length > 0, 10000);
  await sleep(300);
  const labels = labelsOf(row);
  const contents = row.FindChildTraverse("MessageContents");
  assert("translation label injected", ok && labels.length === 1 && labels[0].text.length > 0, labels[0] && labels[0].text);
  assert("label text is Chinese (not raw English)", labels[0] && labels[0].text.indexOf("hello") === -1, labels[0] && labels[0].text);
  assert("original collapsed (translation_only)", contents.style.visibility === "collapse", contents.style.visibility);
}

async function test2_recycleToChineseQuickChat() {
  console.log("\n[2] CORE FIX: row recycled to Chinese quick chat -> visibility restored + no stale label (no vanishing)");
  const env = freshEnv(CFG.translationOnly);
  const row = env.addRow("text", "Alice", "hello can you push mid");
  await waitFor(() => labelsOf(row).length > 0, 10000);
  await sleep(300);
  assert("precondition: collapsed", row.FindChildTraverse("MessageContents").style.visibility === "collapse");
  env.recycleRow(row, "ping", "Alice", "\u53bb\u4e2d\u8def"); // Chinese -> shouldSkip
  await waitFor(() => labelsOf(row).length === 0, 8000);
  const contents = row.FindChildTraverse("MessageContents");
  assert("original visibility restored", contents.style.visibility === "visible", contents.style.visibility);
  assert("stale label removed", labelsOf(row).length === 0, labelsOf(row).length + " left");
}

async function test3_recycleToAnotherEnglish() {
  console.log("\n[3] row recycled to another english msg -> new translation replaces old, no residue");
  const env = freshEnv(CFG.translationOnly);
  const row = env.addRow("text", "Alice", "hello can you push mid");
  await waitFor(() => labelsOf(row).length > 0, 10000);
  env.recycleRow(row, "text", "Alice", "retreat please");
  await waitFor(() => labelsOf(row).length > 0, 10000);
  await sleep(300);
  const labels = labelsOf(row);
  assert("exactly 1 label (no residue)", labels.length === 1, labels.length + " labels");
  assert("label is current message translation", labels[0] && labels[0].text.length > 0 && labels[0].text.indexOf("retreat") === -1, labels[0] && labels[0].text);
  assert("original collapsed (translation_only)", row.FindChildTraverse("MessageContents").style.visibility === "collapse");
}

async function test4_bilingualNoCollapse() {
  console.log("\n[4] bilingual mode: original not collapsed");
  const env = freshEnv(CFG.bilingual);
  const row = env.addRow("text", "Bob", "gg wp");
  const ok = await waitFor(() => labelsOf(row).length > 0, 10000);
  const labels = labelsOf(row);
  assert("translation label injected", ok && labels.length === 1 && labels[0].text.length > 0, labels[0] && labels[0].text);
  assert("original stays visible (bilingual)", row.FindChildTraverse("MessageContents").style.visibility === "visible");
}

async function test5_pingBubbleKept() {
  console.log("\n[5] english quick chat (Ping) in translation_only: bubble kept + translation appended");
  const env = freshEnv(CFG.translationOnly);
  const row = env.addRow("ping", "Carol", "go mid");
  const ok = await waitFor(() => labelsOf(row).length > 0, 10000);
  const labels = labelsOf(row);
  assert("translation label injected", ok && labels.length === 1 && labels[0].text.length > 0, labels[0] && labels[0].text);
  assert("ping bubble NOT collapsed", row.FindChildTraverse("MessageContents").style.visibility === "visible");
}

async function test6_ownMessageSkipped() {
  console.log("\n[6] own message (IsSelf): not translated, not collapsed");
  const env = freshEnv(CFG.translationOnly);
  const row = env.addRow("text", "Me", "hello team", { own: true });
  await sleep(1500);
  assert("no label", labelsOf(row).length === 0);
  assert("original visible", row.FindChildTraverse("MessageContents").style.visibility === "visible");
}

// 新:连续出站翻译——本次 bug 的核心回归
// 快速连续发 3 条不同英文消息,全部应被翻译后发送(此前只有最后一条能翻译)
async function test7_consecutiveOutgoing() {
  console.log("\n[7] BUG FIX: rapid consecutive distinct outgoing messages -> ALL translated (no supersede)");
  const env = freshEnv(CFG.outgoingTranslation);
  // 模拟输入框(ChatInput) + 捕获 stock submit 事件
  const input = env.contextPanel.FindChildTraverse("ChatInput") ||
    env.contextPanel.addChild(new MockPanel("ChatInput"));
  const submitted = [];
  const origDispatch = globalThis.$.DispatchEvent;
  globalThis.$.DispatchEvent = (name, panel) => {
    if (name === "CitadelChatInputSubmitted" && panel) {
      submitted.push(String(panel.text || ""));
    }
    origDispatch(name, panel);
  };

  const texts = ["hello team", "push mid please", "retreat now"];
  for (const t of texts) {
    input.text = t;
    globalThis.LCTOnChatSubmit(); // 等价于游戏里回车
    await sleep(400); // 需 > 150ms 防重窗口(真实用户打字间隔远大于此)
  }

  // 等待全部 3 条出站翻译完成(串行队列 + bing 首次预热)
  const ok = await waitFor(() => submitted.length >= 3, 30000);
  await sleep(500); // 等队列排空
  assert("all 3 messages eventually submitted", ok && submitted.length >= 3, submitted.length + " submits: " + JSON.stringify(submitted));
  const chinese = submitted.filter((s) => s && /[\u4e00-\u9fff]/.test(s));
  assert("all submitted texts are translated (Chinese)", submitted.length >= 3 && chinese.length >= 3, JSON.stringify(submitted));
  assert("no raw English leaked through", submitted.every((s) => s && s.indexOf("hello") === -1 && s.indexOf("push mid") === -1 && s.indexOf("retreat now") === -1), JSON.stringify(submitted));
  globalThis.$.DispatchEvent = origDispatch;
}

async function test8_consecutiveIncoming() {
  console.log("\n[8] rapid consecutive incoming messages -> both translated, no cross-contamination");
  const env = freshEnv(CFG.translationOnly);
  const row1 = env.addRow("text", "Alice", "hello can you push mid");
  const row2 = env.addRow("text", "Bob", "gg wp");
  const ok = await waitFor(() => labelsOf(row1).length > 0 && labelsOf(row2).length > 0, 20000);
  const l1 = labelsOf(row1)[0], l2 = labelsOf(row2)[0];
  assert("both rows translated", ok && !!l1 && !!l2, l1 && l1.text + " | " + l2 && l2.text);
  assert("row1 label is translation of msg1", l1 && l1.text.indexOf("hello") === -1 && l1.text.length > 0, l1 && l1.text);
  assert("row2 label is translation of msg2", l2 && l2.text.indexOf("gg") === -1 && l2.text.length > 0, l2 && l2.text);
}

async function main() {
  console.log("=== Babel Tower lingua_chat simulation tests v4 (bridge must run on 8791) ===");
  await test1_injectAndCollapse();
  await test2_recycleToChineseQuickChat();
  await test3_recycleToAnotherEnglish();
  await test4_bilingualNoCollapse();
  await test5_pingBubbleKept();
  await test6_ownMessageSkipped();
  await test7_consecutiveOutgoing();
  await test8_consecutiveIncoming();
  console.log("\n=== RESULT: PASS " + passCount + " / FAIL " + failCount + " ===");
  process.exit(failCount === 0 ? 0 : 1);
}

main();
