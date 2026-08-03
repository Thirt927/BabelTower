# Babel Tower - 开机自启安装/卸载脚本
# ------------------------------------------------------------------
# 目标:不再需要 StartDeadlock.bat —— 桥随 Windows 登录静默启动,
#      游戏关闭时桥自动退出(由 bridge_server.js 的进程监视实现)。
#
# 方式:注册表 HKCU Run 键 + wscript 无窗口运行项目内 vbs
#      (不依赖启动文件夹,避免已知文件夹重定向问题)
#
# 用法(当前用户级,无需管理员):
#   powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 -Action Install
#   powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 -Action Remove
# ------------------------------------------------------------------
[CmdletBinding()]
param(
  [ValidateSet("Install", "Remove")]
  [string]$Action = "Install"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$RunKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$ValueName = "BabelTowerBridge"
$VbsPath = Join-Path $Root "scripts\babel_bridge_autostart.vbs"

if ($Action -eq "Install") {
  $Node = Join-Path $Root "portable-node\node.exe"
  if (-not (Test-Path $Node)) { $Node = "node" }
  $Server = Join-Path $Root "core\bridge_server.js"
  if (-not (Test-Path $Server)) { throw "找不到桥服务器: $Server" }

  # 生成无窗口启动脚本(第 2 个参数 0 = 隐藏窗口)
  # 引号规则:VBScript 中 "" 表示一个字面引号;两个路径之间必须是 2引号+空格+2引号
  $vbs = 'Set sh = CreateObject("WScript.Shell")' + "`r`n"
  $vbs += 'sh.Run """' + $Node + '"" ""' + $Server + '""", 0, False' + "`r`n"
  [System.IO.File]::WriteAllText($VbsPath, $vbs, (New-Object System.Text.UTF8Encoding($false)))

  # 注册到 HKCU Run(wscript 静默执行 vbs)
  Set-ItemProperty -Path $RunKey -Name $ValueName -Value ('"' + (Join-Path $env:WINDIR "System32\wscript.exe") + '" "' + $VbsPath + '"')
  $installed = (Get-ItemProperty -Path $RunKey -Name $ValueName).$ValueName
  Write-Host "已注册开机自启(Run 键): $installed"
  Write-Host "vbs 位置: $VbsPath"
  Write-Host ""
  Write-Host "之后直接 Steam 启动 Deadlock 即可;游戏退出时桥自动关闭。"
  Write-Host "卸载: powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1 -Action Remove"
} else {
  $removed = $false
  if (Test-Path $VbsPath) { Remove-Item $VbsPath -Force; $removed = $true }
  if (Test-Path $RunKey) {
    $p = Get-ItemProperty -Path $RunKey -Name $ValueName -ErrorAction SilentlyContinue
    if ($p) {
      Remove-ItemProperty -Path $RunKey -Name $ValueName -ErrorAction SilentlyContinue
      $removed = $true
    }
  }
  if ($removed) { Write-Host "已移除开机自启。" } else { Write-Host "未安装过开机自启。" }
}
