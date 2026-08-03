# ============================================================
#  Babel Tower - 一键发布脚本
#  流程: (可选构建) -> 打包完整安装包 -> 生成更新日志 -> gh 发布 -> 版本号自增
#
#  用法:
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version 0.2.0 -Build
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -WhatIf   # 演练,不实际发布
#
#  参数:
#   -Version      指定版本(默认读 VERSION 文件)
#   -Build        先运行 build.ps1 编译 VPK(需要 -Csdk12Root)
#   -Csdk12Root   CSDK 12 根目录(仅 -Build 时用)
#   -Draft        创建草稿 Release
#   -WhatIf       只打印将要执行的步骤,不发布
#   -Force        工作区有未提交改动时也继续(默认中止,保证发布内容与代码一致)
# ============================================================
[CmdletBinding()]
param(
  [string]$Version = "",
  [switch]$Build,
  [string]$Csdk12Root = "<GAME_LIB>\steamapps\common\Deadlock\Reduced_CSDK_12",
  [switch]$Draft,
  [switch]$WhatIf,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root "dist"

function Fail($msg) { Write-Host "[release] 错误: $msg" -ForegroundColor Red; exit 1 }
function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

# ---------- 版本 ----------
if (-not $Version) {
  $Version = (Get-Content (Join-Path $Root "VERSION") -Raw -Encoding UTF8).Trim()
}
if ($Version -notmatch '^\d+\.\d+\.\d+$') { Fail "版本号格式无效: $Version(应为 x.y.z)" }
$Tag = "v$Version"
Write-Host "目标版本: $Version (tag: $Tag)"

# ---------- 工作区检查 ----------
cd $Root
$dirty = git status --porcelain 2>$null
if ($dirty -and -not $Force) {
  Fail "工作区有未提交改动:`n$dirty`n请先提交,或加 -Force 强制发布"
}

# ---------- 构建 ----------
if ($Build) {
  if (-not (Test-Path $Csdk12Root)) { Fail "CSDK 根目录不存在: $Csdk12Root" }
  Step "编译 VPK..."
  if ($WhatIf) { Write-Host "  (WhatIf) 运行 build.ps1" }
  else { powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\build.ps1") -Csdk12Root $Csdk12Root }
}

# ---------- 打包 ----------
Step "打包完整安装包..."
if ($WhatIf) { Write-Host "  (WhatIf) 运行 package_release.ps1 -Version $Version" }
else { powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\package_release.ps1") -Version $Version }

$Zip = Join-Path $Dist "BabelTower-$Version-win64.zip"
$Vpk = Join-Path $Dist "pak01_dir.vpk"
if (-not (Test-Path $Zip)) { Fail "缺少安装包: $Zip" }
if (-not (Test-Path $Vpk)) { Fail "缺少 VPK: $Vpk" }

# ---------- 生成更新日志 ----------
Step "生成更新日志..."
$prevTag = (git describe --tags --abbrev=0 2>$null | Select-Object -First 1)
if ($prevTag) {
  $log = git log "$prevTag..HEAD" --oneline --no-decorate 2>$null
  $logSection = "自 $prevTag 以来的提交:`n`n$log"
} else {
  $log = git log --oneline --no-decorate 2>$null
  $logSection = "提交记录:`n`n$log"
}
$notes = @"
Babel Tower v$Version

完整安装包($([System.IO.Path]::GetFileName($Zip)))含:VPK + 本地桥 + 内置 Node + 自启脚本 + 安装说明,下载即用。

## 更新内容
$logSection

## 安装(3 步)
1. 解压 zip,Mod Manager 导入 pak01_dir.vpk
2. powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 -Action Install
3. 游戏内 /tr → 测试 → 保存

详细说明见包内《安装使用说明.txt》。
"@
$notesFile = Join-Path $env:TEMP "babeltower_notes_$Version.md"
[System.IO.File]::WriteAllText($notesFile, $notes, (New-Object System.Text.UTF8Encoding($true)))
if ($WhatIf) { Write-Host "  (WhatIf) 更新日志将写入: $notesFile" }

# ---------- 发布 ----------
if ($WhatIf) {
  Write-Host ""
  Write-Host "===== WhatIf 演练结果 =====" -ForegroundColor Yellow
  Write-Host "将执行: gh release create $Tag $Zip $Vpk --title 'Babel Tower v$Version' $(if($Draft){'--draft'})"
  Write-Host "之后将: VERSION $Version -> $([int]([version]$Version).Build + 1) 补丁号自增并提交推送"
  exit 0
}

Step "创建 GitHub Release..."
$args = @("release", "create", $Tag, $Zip, $Vpk, "--title", "Babel Tower v$Version", "--notes-file", $notesFile)
if ($Draft) { $args += "--draft" }
gh @args 2>&1 | Select-Object -Last 2
if ($LASTEXITCODE -ne 0) { Fail "gh release create 失败" }

# ---------- 版本号自增 ----------
$parts = $Version -split '\.'
$next = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)"
Step "版本号自增: $Version -> $next"
[System.IO.File]::WriteAllText((Join-Path $Root "VERSION"), $next + "`n", (New-Object System.Text.UTF8Encoding($false)))
git add VERSION
git commit -m "Bump version to $next" | Out-Null
git push origin main 2>&1 | Out-Null

Write-Host ""
Write-Host "发布完成: https://github.com/c1375rick/BabelTower/releases/tag/$Tag" -ForegroundColor Green
