$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Set-Location "$repo/backend"
& .venv/Scripts/python.exe -I -m pytest -q
if ($LASTEXITCODE) { throw 'Backend tests failed' }
& .venv/Scripts/ruff.exe check .
if ($LASTEXITCODE) { throw 'Backend lint failed' }
& .venv/Scripts/ruff.exe format --check .
if ($LASTEXITCODE) { throw 'Backend format check failed' }
Set-Location "$repo/frontend"
npm.cmd run test
if ($LASTEXITCODE) { throw 'Frontend tests failed' }
npm.cmd run lint
if ($LASTEXITCODE) { throw 'Frontend lint failed' }
npm.cmd run build
if ($LASTEXITCODE) { throw 'Frontend build failed' }
