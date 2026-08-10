const fs = require("fs");
const xml = fs.readFileSync("F:/BabelTower/mod/panorama/layout/chat.xml", "utf8");
const js = fs.readFileSync("F:/BabelTower/mod/panorama/scripts/lingua_chat.js", "utf8");

const entries = xml.match(/<TextEntry[^>]*>/g) || [];
console.log("=== TextEntry 节点 (" + entries.length + ") ===");
entries.forEach(e => console.log("  " + e.trim()));

console.log("\n=== JS 新函数 ===");
["function LCTEntryBlur", "function LCTEntryKey", 'exportGlobal("LCTEntryBlur"', 'exportGlobal("LCTEntryKey"'].forEach(p => {
  console.log("  " + p + " -> " + (js.includes(p) ? "FOUND" : "MISSING"));
});

// 检查 onkeydown 引用函数是否都定义了
const badRefs = [];
for (const m of xml.matchAll(/on(?:blur|keydown)="([A-Za-z0-9_]+)\(/g)) {
  if (!js.includes("function " + m[1])) badRefs.push(m[1]);
}
console.log("\n=== XML 引用但 JS 未定义的函数 ===");
console.log(badRefs.length ? "  " + badRefs.join(", ") : "  无 (全部已定义)");
