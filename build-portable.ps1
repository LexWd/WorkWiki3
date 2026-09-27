# WorkWiki 3 - PowerShell build script
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "         WorkWiki 3 — Автоматическая сборка Windows EXE             " -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ОШИБКА] Node.js не найден в системе!" -ForegroundColor Red
    Write-Host "Скачайте и установите Node.js LTS: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Или запустите: winget install OpenJS.NodeJS.LTS" -ForegroundColor Gray
    Read-Host "Нажмите Enter для выхода..."
    exit 1
}

Write-Host "[1/3] Установка зависимостей (npm install)..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Сбой при установке зависимостей npm!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/3] Компиляция приложения и упаковка в EXE..." -ForegroundColor Green
npm run electron:build:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Сбой при сборке electron-builder!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[3/3] Сборка успешно завершена!" -ForegroundColor Green
Write-Host "Готовые файлы расположены в папке release/:" -ForegroundColor Cyan
Get-ChildItem -Path "release" -Filter "*.exe" | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  -> $($_.Name) ($sizeMB MB)" -ForegroundColor Yellow
}

Invoke-Item "release"

$response = Read-Host "Запустить WorkWiki-3-Portable прямо сейчас? (Y/n)"
if ($response -eq "" -or $response -match "^[yYдД]") {
    $portable = Get-ChildItem -Path "release" -Filter "WorkWiki-3-Portable-*.exe" | Select-Object -First 1
    if (-not $portable) {
        $portable = Get-ChildItem -Path "release" -Filter "WorkWiki*.exe" | Select-Object -First 1
    }
    if ($portable) {
        Start-Process $portable.FullName
    }
}
