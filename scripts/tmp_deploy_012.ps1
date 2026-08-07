$ErrorActionPreference = "Stop"
$vpk = "<PROJECT_DIR>\dist\pak01_dir.vpk"
$addons = "<GAME_LIB>\steamapps\common\Deadlock\game\citadel\addons\pak11_dir.vpk"
$dmm = "C:\Users\kali1\AppData\Local\dev.stormix.deadlock-mod-manager\mods\local-9a893075-8d63-4058-9fbe-406f3b2d395b\files\pak01_dir.vpk"
Copy-Item -Path $vpk -Destination $addons -Force
Copy-Item -Path $vpk -Destination $dmm -Force
Get-FileHash $vpk, $addons, $dmm | ForEach-Object { "$($_.Path.Split('\')[-3..-1] -join '\'): $($_.Hash)" }
