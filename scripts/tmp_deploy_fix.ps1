# Deploy rebuilt vpk to addons + DMM source (dist already has it)
$ErrorActionPreference = "Stop"
$vpk = "F:\BabelTower\dist\pak01_dir.vpk"
$addons = "F:\SteamLibrary\steamapps\common\Deadlock\game\citadel\addons\pak11_dir.vpk"
$dmm = "C:\Users\kali1\AppData\Local\dev.stormix.deadlock-mod-manager\mods\local-9a893075-8d63-4058-9fbe-406f3b2d395b\files\pak01_dir.vpk"

Copy-Item -Path $vpk -Destination $addons -Force
Write-Output "addons copied"
Copy-Item -Path $vpk -Destination $dmm -Force
Write-Output "dmm copied"

Write-Output "=== hashes ==="
Get-FileHash $vpk | ForEach-Object { "dist:   " + $_.Hash }
Get-FileHash $addons | ForEach-Object { "addons: " + $_.Hash }
Get-FileHash $dmm | ForEach-Object { "dmm:    " + $_.Hash }
