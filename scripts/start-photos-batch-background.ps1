# Lance le batch photos Commons en arrière-plan, indépendant du terminal.
# Le processus continue même si tu fermes cette fenêtre.
#
# Usage : double-clic ou dans PowerShell :
#   .\scripts\start-photos-batch-background.ps1

$projectRoot = Split-Path -Parent $PSScriptRoot
$logFile = Join-Path $projectRoot "photos-batch.log"

Set-Location $projectRoot

Write-Host "Lancement du batch photos en arrière-plan..."
Write-Host "Log : $logFile"
Write-Host ""

# Démarrer dans un nouveau processus détaché (survit à la fermeture du terminal)
# Attention : si tu exécutes "Stop-Process -Name node", ça arrêtera aussi le batch
$cmd = "cd /d `"$projectRoot`" && npx tsx scripts/fetch-commons-photos-batch.ts"
Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", $cmd `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError "$logFile.err"

Write-Host "Batch démarré. Suis la progression sur /maintenance"
Write-Host "Pour arrêter : Get-Process -Name node | Where-Object { `$_.MainWindowTitle -eq '' } | Stop-Process"
