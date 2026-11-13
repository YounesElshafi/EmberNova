$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo
Write-Host 'Start API: cd backend; .venv/Scripts/python.exe -I -m uvicorn embernova.main:app --host 127.0.0.1 --port 8000'
Write-Host 'Start UI in another terminal: cd frontend; npm.cmd run dev'
Write-Host 'Or build the UI and open http://127.0.0.1:8000 to use the combined app.'
