const fs = require("fs");
const base = "F:/SteamLibrary/steamapps/common/Deadlock/Reduced_CSDK_12/content/citadel_addons/linguachat/panorama";
const jsPath = base + "/scripts/lingua_chat.js";
const xmlPath = base + "/layout/chat.xml";
const cssPath = base + "/styles/lingua_chat.css";

for (const [name, p] of [["vjs_c", jsPath], ["vxml_c(源)", xmlPath], ["vcss_c(源)", cssPath]]) {
  if (!fs.existsSync(p)) { console.log(name + " MISSING: " + p); continue; }
  const c = fs.readFileSync(p, "utf8");
  const stat = fs.statSync(p);
  console.log("=== " + name + " (" + stat.size + "B) ===");
  ["LCTEntryBlur", "LCTEntryKey", "DropInputFocus"].forEach(k => console.log("  " + k + " -> " + c.includes(k)));
  if (name === "vjs_c") {
    // 检查编译后是否保留 onkeydown 引用(编译会转义,但函数名应保留)
    console.log("  onkeydown 引用 -> " + (c.includes("LCTEntryKey") ? "是(LCTEntryKey 保留)" : "否"));
  }
}
