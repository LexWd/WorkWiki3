@echo off
chcp 65001 >nul
title WorkWiki 3 — Сборка Setup инсталлятора Windows
cls

echo ====================================================================
echo             WorkWiki 3 — Сборка Setup EXE для Windows
echo ====================================================================
echo.

REM Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден в системе!
    echo Пожалуйста, установите Node.js LTS (версия 18, 20 или 22):
    echo Скачать: https://nodejs.org/
    echo Или выполните в консоли: winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)

echo [1/3] Проверка и установка зависимостей (npm install)...
call npm install
call npm install --no-save @rollup/rollup-win32-x64-msvc 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось установить зависимости npm.
    pause
    exit /b 1
)

echo.
echo [2/3] Компиляция приложения и упаковка в Setup инсталлятор (1-Click Update)...
call npm run electron:build:win
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Сборка electron-builder завершилась с ошибкой.
    pause
    exit /b 1
)

echo.
echo [3/3] Сборка успешно завершена!
echo.
echo Готовый файл в папке "release":
echo   -> WorkWiki-3-Setup-2.3.2.exe (Автоматический установщик с поддержкой 1-клик обновлений)
echo.
echo Открываем папку с готовым файлом...
start "" "release"

echo.
set /p runNow="Запустить установщик прямо сейчас? (Y/N, по умолчанию Y): "
if /i "%runNow%"=="" set runNow=Y
if /i "%runNow%"=="Y" (
    for %%F in (release\WorkWiki-3-Setup-*.exe release\WorkWiki*.exe) do (
        echo Запуск %%F...
        start "" "%%F"
        goto end
    )
)

:end
echo.
echo Готово! Нажмите любую клавишу для выхода.
pause >nul
