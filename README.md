# Babel Tower — Deadlock 游戏内聊天翻译 Mod

把《Deadlock》聊天里的外语消息实时翻译成你的语言,译文直接显示在原消息下方;
也支持"发送前把要说的话翻译成目标语言"(仅译文 / 原文|译文 双语模式)。

- 架构:全景(游戏内 Panorama 界面)+ 本地翻译桥(Node.js 本地服务)+ 翻译服务商
- 默认服务商:**Bing Translator(公共免费接口,免 Key,国内直连可用)**;可选 Microsoft(Azure)、OpenAI 兼容(OpenAI/Ollama/LM Studio/OneAPI)、DeepL、Google Cloud;主服务商失败可自动回退到已配置 Key 的其他服务商
- 原理:聊天行扫描 → 去重/缓存 → 隐藏 HTML 面板桥接本地服务 → 译文追加显示
- 许可证:**GNU GPL v3**,见 [LICENSE](LICENSE)

> 状态:核心(本地桥)与游戏内界面均已实测可用;游戏内部分依赖 Valve 反编译结构与
> 已验证的 API 模式,详见 [docs/architecture.md](docs/architecture.md)。

## 本 Fork 优化亮点(相对上游)

- **五服务商 + 失败回退**:Bing(免 Key)/ Microsoft / OpenAI 兼容 / DeepL / Google Cloud,
  主服务商失败自动尝试已配置 Key 的备用服务商
- **DeepSeek / OpenAI 兼容专项**:翻译模式提示词(system+user 双重指令,只输出译文)、
  Key 按服务商正确落位、`temperature` 400 自动重试、输出清洗(去引号/括号)
- **发送前翻译**:超时 20s 并透传桥端(长文本首次发送即出译文)、双语长文本保护
  (保留原文,译文超 400 字符截断)、失败自动重试一次、桥未连接时立即按原文发送
- **译文蓝色气泡样式**:译文改为浅蓝斜体 + 深色半透明底气泡,普通聊天/HUD 顶栏/
  翻译失败提示统一风格,深浅背景均可读
- **桥健康探测 + 状态栏**:每 5 秒探测桥,状态栏显示"桥在线·服务商 X / 桥离线",
  离线不再静默失败
- **配置持久化 + Key 防误清空**:面板选项经桥保存,重启不丢;空字段不再误删已保存的 Key
- **设置面板 UI 优化**:服务商/显示模式等改为下拉菜单、配置行按需显示、
  面板加宽(660x600)可滚动、新增回退服务商与聊天日志配置
- **聊天日志(按比赛 ID)**:开启后每局消息写入 `logs/chat/<比赛ID>.jsonl`,
  含时间/昵称/英雄/SteamID/频道等字段,便于赛后复盘与违规举报
- **大厅聊天支持**:新增大厅布局覆盖(`hudchat.xml`),大厅聊天也能翻译,
  设置面板/`译`按钮/发送接管在大厅同样可用
- **启动行为调整**:`StartDeadlock.bat` 默认只启动翻译桥,连游戏一起启动用 `-game` 参数
- **启动器与桥进程健壮性**:启动前健康检查防重复启动、端口残留自动清理、启动结果明确提示;
  桥监视游戏退出需连续 3 次确认(约 6s),不再误杀;桥日志统一落盘 `logs/bridge.log`
- **游戏兼容修复**:`$.AsyncWebRequest` 被游戏移除后自动回退 HTML 面板通道,翻译不断
- **内置词典**:2801 条中文常用短句/游戏术语 + 英雄名官方译名/简写,短词零延迟直译
- **质量保障**:45 项模拟测试(`scripts/lingua_chat_simtest.js`)全过
---

## 目录结构

```
BabelTower/
├── mod/panorama/          游戏内 UI 源码(需编译成 VPK 安装)
│   ├── layout/chat.xml      聊天布局覆盖(含设置面板)
│   ├── layout/hudchat.xml   大厅聊天布局覆盖(大厅也可翻译)
│   ├── scripts/lingua_chat.js  主逻辑:扫描/去重/缓存/桥接/设置(内部代号 LCT)
│   └── styles/lingua_chat.css  译文与设置面板样式
├── core/                  本地翻译桥(Node.js,零依赖)
│   ├── bridge_server.js      桥服务器 + 隐藏面板页面
│   ├── config.js             本地配置管理(apiKey 打码)
│   ├── dictionary.js         自适应学习词典(短词直译,见下方教程)
│   └── providers/            五个服务商:Bing(免 Key)/ Microsoft / OpenAI 兼容 / DeepL / Google
├── config/config.example.json  桥配置示例(复制为 config.json 使用)
├── config/dictionary.json   词典数据(user 手动 + learned 自动学习)
├── config/dictionary.builtin.json  内置词典(2801 条中文常用短句/游戏术语,随发行附带)
├── core/hero_names.js       英雄名官方译名 + 前缀/首字母简写(abr→亚伯兰, gt→灰爪 等)
├── scripts/build.ps1       编译 + 打包 VPK 脚本
├── scripts/autostart.ps1   开机自启安装/卸载
├── StartDeadlock.bat       手动启动:默认只启动翻译桥(-game 连游戏一起启动)
└── docs/                   架构文档
```

> 说明:项目对外品牌名为 **Babel Tower**;内部功能标识符沿用 LCT/lingua_chat 代号
> (游戏内已测稳定,避免改名引入回归),二者指同一项目。

## 安装

1. 获取 `dist/pak01_dir.vpk`(自行构建,见下;或使用 GitHub Release 附件)
2. 安装到 Deadlock(**二选一**):
   - **推荐**:用 Deadlock Mod Manager 导入(自动分配空闲 pak 槽位)
   - 或手动:复制到 `game/citadel/addons/` 目录(改名为空闲的 `pakNN_dir.vpk`,避免覆盖其它 mod)
3. 安装 Node.js 18+([nodejs.org](https://nodejs.org)),或使用项目自带的 `portable-node/`
4. 一键自启(推荐,之后 Steam 直接启动游戏即可,游戏退出桥自动关闭):

```powershell
# 先进入项目目录(换成你的实际路径)
cd D:\BabelTower
powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 -Action Install
```

> 若提示找不到脚本,说明当前目录不对:先 `cd` 到项目目录,或用完整路径
> `powershell -ExecutionPolicy Bypass -File "<你的路径>\scripts\autostart.ps1" -Action Install`

5. (可选)不用自启时,双击 `StartDeadlock.bat` 手动启动(默认只启动翻译桥,不自动启动游戏;
   需要连游戏一起启动请用 `StartDeadlock.bat -game`)

## 使用

| 操作 | 说明 |
| --- | --- |
| 聊天输入 `/tr` 回车 | 打开设置面板(鼠标锁定也能用) |
| 输入框右侧 **译** 按钮 | 打开设置面板(鼠标可用时) |
| 设置面板 | 选项均为**点击选择**,改完点**保存**生效;ESC 关闭 |

设置项:

- **启用翻译**:总开关
- **翻译自己的消息**:开关(默认开,自己的发言也翻译)
- **服务商**:下拉选择 `bing(免 Key)` / `microsoft(Azure Key)` / `OpenAI 兼容` / `DeepL` / `Google Cloud`
- **API Key / 区域 / Base URL / 模型**:按所选服务商显示对应输入(Key 只保存在本地 `config/config.json`,打码显示)
- **服务商失败自动回退**:填逗号分隔的服务商名(如 `microsoft,openai`),主服务商失败时自动尝试已填 Key 的备用服务商
- **聊天日志**:开关按比赛 ID 记录聊天到本地 `logs/chat/`(见下文)
- **目标语言**:下拉选择(简中/繁中/英/日/韩/法/德/西 + 自定义)
- **显示模式**:双语(原文+译文)⇄ 仅译文
- **发送前翻译**:关(发原文)⇄ 仅译文 ⇄ 双语(原文 | 译文)
- **发送目标语言**:下拉选择
- **超时(ms)** / **强制翻译**

行为说明:

- 自己的消息默认也翻译(设置面板“翻译自己的消息”可关闭)
- 已是目标语言的消息(启发式判断)不重复翻译
- 纯数字/符号、指令(`/` 开头)不翻译
- 翻译失败自动重试一次,仍失败显示红字错误
- 聊天滚动/回收后,译文会从缓存自动重建

## 翻译词典(自适应学习 + 内置词典)

词典用于**稳定短句/游戏术语的翻译**:命中词典的词条直接查表返回(毫秒级),
不走翻译服务商,避免 Bing 对短词(如 `gg`、`mid`)翻译结果抖动的问题。

### 内置词典(开箱即用)

项目随发行附带 `config/dictionary.builtin.json`,内置 **2801 条**中文常用短句/游戏术语
(Deadlock 官方英雄/道具译名、MOBA/FPS 交流用语、玩家礼貌用语等),无需配置即可命中:

- 游戏术语秒翻:`glhf`→祝好运玩得开心、`go next`→下一把、`first blood`→一血、`team diff`→队友差距
- 英雄名支持**前缀/首字母简写**(来自 `core/hero_names.js`,47 名英雄官方译名):
  - `abr`→亚伯兰、`sev`→七、`wra`→灵魅、`haz`→岚梦、`dyn`→奇能
  - 多词英雄首字母:`gt`→灰爪(Grey Talon)、`lg`→盖斯特夫人(Lady Geist)、`mk`→莫克双雄(Mo & Krill)
  - 可组合使用:`abr mid`→亚伯兰 中路、`go gt bot`→去 灰爪 下路
- 内置词典只在"每个词都能查表且至少含一个英雄简写"时才整句组合,不会抢走在线翻译的活
- 查表顺序:**user 手动区 > 内置词典 > learned 学习区**

### 自动学习(无需手动操作)

- 词典**空表起步**,随着游戏进行自动累积你常用的短句
- 学习规则:纯 ASCII 短文本(≤30 字符、≤5 个词)+ 译文 ≠ 原文
- 同一译文**出现 3 次 → 立即固化落盘**,之后该词条查表秒回
- 防误译保护:译文与原文相同、或译文只有 1 个字符而原文是 2+ 字母词(如 `gank`→`去`)
  等可疑结果不会被学习

### 手动编辑(config/dictionary.json)

文件结构(`config/dictionary.json`,桥运行目录下):

```json
{
  "user": {
    "zh": {
      "glhf": "祝好运，玩得开心"
    }
  },
  "learned": {}
}
```

- **`user` 区**:你手动写的词条(程序不覆盖,优先于 learned 生效)
  - 固定词条、或 Bing 某词翻得不好时,直接写这里覆盖
- **`learned` 区**:程序自动学习写入,**不要手动编辑**(下次固化会被覆盖)
- **语言前缀**:`zh`(简中/繁中)、`en`、`ja`、`ko`、`fr`、`de`、`es` 等,
  按你在设置里选的**目标语言**匹配(zh-Hans/zh-CN/zh-TW 都命中 `zh`)
- 修改后**重启桥**(或等下次自动加载)生效

### 关闭词典

在 `config/config.json` 里加:

```json
{
  "dictionary": { "enabled": false }
}
```

关闭后所有词条都走翻译服务商(不查表、不学习)。

## 翻译服务商

### 默认:Bing Translator(免 Key,公共免费接口)

- 使用 Bing 网页翻译同款协议(翻译页提取 IG/IID/token,POST `ttranslatev3`),国内直连可用
- 无需注册;公共接口有隐形限流,出现 429 会自动重试
## 推荐做法：直接编辑配置文件填写 Key

### 1. 文件位置

```
BabelTower/config/config.json
```

首次运行会自动从 `config.example.json` 生成。**桥运行期间修改立即生效**（每次请求都会重新读取配置），改完保存即可，无需重启桥或游戏。

### 2. 填写方式

打开 `config/config.json`，按你使用的服务商在对应位置填 Key（保留 JSON 格式：键值用双引号，末尾逗号不能乱）：

```
{
  "provider": "openai",
  "openai": {
    "apiKey": "sk-你的Key",
    "baseUrl": "https://api.deepseek.com",
    "model": "deepseek-v4-flash"
  },
  "fallbackProviders": ["microsoft"]
}
```

各服务商对应字段：

| 服务商                            | provider 填   | Key 填这里         | 可选字段                         |
| --------------------------------- | ------------- | ------------------ | -------------------------------- |
| Bing（免 Key）                    | `"bing"`      | 无需填写           | —                                |
| OpenAI 兼容（含 DeepSeek/Ollama） | `"openai"`    | `openai.apiKey`    | `openai.baseUrl`、`openai.model` |
| Microsoft Azure                   | `"microsoft"` | `microsoft.apiKey` | `microsoft.region`               |
| DeepL                             | `"deepl"`     | `deepl.apiKey`     | `deepl.endpoint`（free/pro）     |
| Google Cloud                      | `"google"`    | `google.apiKey`    | —                                |

### 3. 常见问题

- **改了不生效？** 检查 JSON 语法（可用记事本打开看有没有红色波浪线），或确认 `provider` 填的是你要用的服务商。
- **在文件里填了 Key，之后在游戏里点保存会丢吗？** 不会。面板保存时空 Key 字段不会覆盖文件里已填的 Key，只有显式清空才会删。
- **Key 会被发出去吗？** 不会。Key 只存本地 `config.json`，游戏面板回传的是打码后的 `********`，日志也绝不输出 Key。
- **想要主服务商失败自动切换**：在 `fallbackProviders` 里列其他服务商（只尝试已填 Key 的），例如 `["microsoft", "openai"]`。



### 服务商失败自动回退

主服务商不稳定/限流时,可在设置面板的"服务商失败自动回退"输入逗号分隔的备用服务商
(如 `microsoft,openai`),桥会自动尝试**已填 Key** 的备用服务商(免 Key 的 bing 也可作为备用)。
不填则失败直接返回错误。

## 聊天日志(按比赛 ID 划分)
**目前聊天日志功能实现不完全。**

- 开启后,每局聊天的消息会写入 `logs/chat/<比赛ID>.jsonl`(JSON Lines 格式),一局一个文件
- 每条记录包含:时间、发送人昵称、英雄、英雄 ID、SteamID、频道、是否自己、消息原文
- 字段获取:优先读聊天行面板属性;读不到时按昵称匹配 `Players.GetPlayerInfo` 尽力补全
  英雄/SteamID(仍可能为空,取决于游戏 API 是否提供)
- 日志去重:HUD 顶栏与左下聊天是同一消息的重复展示,只记一次;未填充完整的不完整行
  不会落盘(字段就绪后由低延迟尾扫重新采集)
- 可用 `logs/chat/` 下的 JSONL 文件做赛后复盘/违规举报素材
- 关闭:设置面板"聊天日志"开关,或 `config/config.json` 里 `chatLog.enabled=false`



## 从源码构建 VPK

需要 [Reduced CSDK 12](https://deadlockmodding.pages.dev/modding-tools/csdk-12) 与
[VPKEdit CLI](https://github.com/craftablescience/VPKEdit/releases)(放入 `tools/`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Csdk12Root "<CSDK_DIR>"
```

产物 `dist/pak01_dir.vpk` 经 Mod Manager 导入。

## 本地测试(不开游戏)

```powershell
node core\bridge_server.js
# 另开终端:
curl.exe http://127.0.0.1:8791/api/v1/health
curl.exe -X POST http://127.0.0.1:8791/api/v1/translate -H "Content-Type: application/json" -d "{\"text\":\"hello\",\"targetLanguage\":\"zh-Hans\"}"
```

## 故障排查

| 现象 | 处理 |
| --- | --- |
| 译文显示"本地桥未运行" | 确认桥在运行(自启/StartDeadlock.bat/手动 node);或看 `logs\bridge.log` |
| Bing 接口报错 | 公共接口偶发不稳,自动重试;长期不行切 Microsoft |
| 401/403(用 Microsoft 时) | Key 错误;403 检查是否需填区域 |
| 完全不翻译 | 检查"启用翻译"、目标语言;确认桥日志有请求进来 |
| 聊天发不出去 | 见 docs/architecture.md「消息流(发)」的发送接管说明 |

## 许可证与致谢

- 本项目代码:**GNU GPL v3**,见 [LICENSE](LICENSE) 与 [LICENSE_NOTICE.md](LICENSE_NOTICE.md)
- 原版聊天布局结构(chat.xml 中的 Valve 素材片段):保留原样以保证功能,版权归 Valve
- 技术路线参考:RogueCore Chat Translator(UE4SS 思路)、
  Hantu-Raya/Deadlock-mods-collection(Apache-2.0,提供了原版 chat.xml 反编译与
  Panorama 轮询模式参考)、plainheart/bing-translate-api(公共接口协议参考)
