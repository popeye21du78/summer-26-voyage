# Arrête Node, supprime .next, relance le serveur dev.
# Résout les conflits de port et de lock.
#
# Usage : npm run restart

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Arrêt des processus Node..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Suppression du dossier .next..."
npx rimraf .next

Write-Host "Démarrage du serveur..."
npm run dev
