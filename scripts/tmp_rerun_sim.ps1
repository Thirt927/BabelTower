cd F:\BabelTower
node scripts\lingua_chat_simtest.js > tmp_simtest_full.log 2>&1
Get-Content tmp_simtest_full.log | Select-String -Pattern "FAIL|RESULT|test \[|======" -Context 0,3 | Out-String -Width 200
