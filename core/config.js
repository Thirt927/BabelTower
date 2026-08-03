// Babel Tower - 本地配置管理
// 配置只存放在本地磁盘 config/config.json(绝不进入 VPK / Git / 日志)。
// 首次运行会自动从 config.example.json 生成。
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  port: 8791,
  provider: "bing",
  bing: {},
  microsoft: {
    apiKey: "",
    region: "",
    endpoint: "https://api.cognitive.microsofttranslator.com",
  },
  defaults: {
    sourceLanguage: "auto",
    targetLanguage: "zh-Hans",
  },
  timeoutMs: 15000,
  maxQueue: 200,
  // 进程监视:Deadlock 退出时桥自动关闭(设为 false 或启动参数 --no-watch 可禁用)
  watchGame: true,
  watchGameExe: "deadlock.exe",
  // 可选文件日志(相对项目根目录;留空则不落盘)
  logFile: "",
};

function configDir() {
  return path.join(__dirname, "..", "config");
}

function configPath() {
  return path.join(configDir(), "config.json");
}

function examplePath() {
  return path.join(configDir(), "config.example.json");
}

function deepMerge(base, extra) {
  const out = Object.assign({}, base);
  for (const key of Object.keys(extra || {})) {
    const v = extra[key];
    if (v && typeof v === "object" && !Array.isArray(v) && base[key] && typeof base[key] === "object") {
      out[key] = deepMerge(base[key], v);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function normalize(raw) {
  const cfg = deepMerge(DEFAULTS, raw || {});
  if (!Number.isFinite(Number(cfg.port))) cfg.port = DEFAULTS.port;
  if (!Number.isFinite(Number(cfg.timeoutMs))) cfg.timeoutMs = DEFAULTS.timeoutMs;
  if (!Number.isFinite(Number(cfg.maxQueue))) cfg.maxQueue = DEFAULTS.maxQueue;
  return cfg;
}

function load() {
  try {
    if (fs.existsSync(configPath())) {
      return normalize(JSON.parse(fs.readFileSync(configPath(), "utf8")));
    }
  } catch (e) {
    // 配置损坏时回退默认值,不崩溃
  }
  return normalize({});
}

function save(cfg) {
  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf8");
}

// 返回给游戏面板的配置(apiKey 打码,绝不回传明文)
function mask(cfg) {
  const key = (cfg.microsoft && cfg.microsoft.apiKey) || "";
  return {
    port: cfg.port,
    provider: cfg.provider,
    microsoft: {
      apiKey: key ? "********" : "",
      hasApiKey: !!key,
      region: (cfg.microsoft && cfg.microsoft.region) || "",
      endpoint: (cfg.microsoft && cfg.microsoft.endpoint) || DEFAULTS.microsoft.endpoint,
    },
    defaults: {
      sourceLanguage: (cfg.defaults && cfg.defaults.sourceLanguage) || "auto",
      targetLanguage: (cfg.defaults && cfg.defaults.targetLanguage) || "zh-Hans",
    },
    timeoutMs: cfg.timeoutMs,
  };
}

// 保存配置时处理打码回传:apiKey 为 "********" 表示保留原值;空串表示清除
// 同时兼容两种输入形态:
//   嵌套式(直接调 API):  { microsoft:{apiKey,region,endpoint}, defaults:{...}, provider, timeoutMs }
//   扁平式(游戏面板):    { provider, apiKey, region, targetLanguage, sourceLanguage, timeoutMs }
function applyMaskedUpdate(current, incoming) {
  const cfg = normalize(current);

  // 嵌套式 microsoft 块
  if (incoming.microsoft) {
    const ms = incoming.microsoft;
    if (typeof ms.apiKey === "string") {
      if (ms.apiKey && ms.apiKey !== "********") cfg.microsoft.apiKey = ms.apiKey;
      if (ms.apiKey === "") cfg.microsoft.apiKey = "";
    }
    if (typeof ms.region === "string") cfg.microsoft.region = ms.region;
    if (typeof ms.endpoint === "string" && ms.endpoint) cfg.microsoft.endpoint = ms.endpoint;
  }

  // 扁平式(面板)字段
  if (typeof incoming.apiKey === "string") {
    if (incoming.apiKey && incoming.apiKey !== "********") cfg.microsoft.apiKey = incoming.apiKey;
    if (incoming.apiKey === "") cfg.microsoft.apiKey = "";
  }
  if (typeof incoming.region === "string") cfg.microsoft.region = incoming.region;

  if (typeof incoming.provider === "string" && incoming.provider) cfg.provider = incoming.provider;

  if (incoming.defaults) {
    if (typeof incoming.defaults.sourceLanguage === "string") cfg.defaults.sourceLanguage = incoming.defaults.sourceLanguage;
    if (typeof incoming.defaults.targetLanguage === "string") cfg.defaults.targetLanguage = incoming.defaults.targetLanguage;
  }
  if (typeof incoming.targetLanguage === "string" && incoming.targetLanguage) {
    cfg.defaults.targetLanguage = incoming.targetLanguage;
  }
  if (typeof incoming.sourceLanguage === "string" && incoming.sourceLanguage) {
    cfg.defaults.sourceLanguage = incoming.sourceLanguage;
  }

  if (Number.isFinite(Number(incoming.timeoutMs))) cfg.timeoutMs = Number(incoming.timeoutMs);
  return cfg;
}

module.exports = { load, save, mask, applyMaskedUpdate, configPath, examplePath, DEFAULTS };
