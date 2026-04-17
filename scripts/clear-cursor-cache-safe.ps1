# Nettoyage cache Cursor (Windows) — À lancer PREFERABLEMENT avec Cursor FERME.
# Usage : powershell -ExecutionPolicy Bypass -File scripts/clear-cursor-cache-safe.ps1
# Option -KillNode : termine les processus node.exe orphelins (ferme aussi tes serveurs dev !)

param([switch]$KillNode)

$ErrorActionPreference = "Stop"
$base = Join-Path $env:APPDATA "Cursor"

if (-not (Test-Path $base)) {
    Write-Host "Dossier introuvable: $base" -ForegroundColor Red
    exit 1
}

$running = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "ATTENTION: Cursor est encore ouvert. Ferme Cursor (Fichier > Quitter), puis relance ce script." -ForegroundColor Yellow
    exit 2
}

if ($KillNode) {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Fin de tâche node PID $($_.Id)"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

$dirs = @("Cache", "GPUCache", "Code Cache")
foreach ($d in $dirs) {
    $p = Join-Path $base $d
    if (Test-Path $p) {
        Write-Host "Suppression: $p"
        Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "OK. Relance Cursor." -ForegroundColor Green
Write-Host "Option avancee (plus lourd, ~400 Mo CachedData): supprime manuellement le dossier CachedData si besoin apres sauvegarde."
