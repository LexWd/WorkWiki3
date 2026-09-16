@echo off
chcp 65001 >nul
title QuickReply Desk — Сборка Windows EXE
cls

echo ====================================================================
echo             QuickReply Desk — Сборка EXE для Windows
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
echo [2/3] Компиляция приложения и упаковка в Windows EXE (Portable + Setup)...
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
echo Файлы готовы в папке "release":
echo   1. QuickReply-Desk-Portable-1.0.0.exe  (Один автономный файл, запуск без установки)
echo   2. QuickReply Desk Setup 1.0.0.exe     (Классический инсталлятор с ярлыками)
echo.
echo Открываем папку с готовыми файлами...
start "" "release"

echo.
set /p runNow="Запустить Portable EXE прямо сейчас? (Y/N, по умолчанию Y): "
if /i "%runNow%"=="" set runNow=Y
if /i "%runNow%"=="Y" (
    for %%F in (release\QuickReply-Desk-Portable-*.exe) do (
        echo Запуск %%F...
        start "" "%%F"
        goto end
    )
)

:end
echo.
echo Готово! Нажмите любую клавишу для выхода.
pause >nul
