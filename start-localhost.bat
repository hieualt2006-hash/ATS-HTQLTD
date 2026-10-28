@echo off
chcp 65001 >nul
title ATS - He Thong Quan Ly Tuyen Dung (Dev Server)

:: Chuyen thu muc lam viec ve thu muc chua file .bat nay
cd /d "%~dp0"

echo ===================================================================
echo     HE THONG QUAN LY TUYEN DUNG ATS ENTERPRISE (B2B SaaS)
echo ===================================================================
echo.
echo [*] Dang kiem tra moi truong Node.js...

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js / npm trong he thong!
    echo Vui long cai dat Node.js tu: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Tu dong cai dat dependencies neu chua co node_modules
if not exist "node_modules" (
    echo [*] Chua tim thay node_modules, dang chay npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [LOI] Cai dat dependencies that bai!
        pause
        exit /b 1
    )
)

echo.
echo ===================================================================
echo  [+] Localhost URL : http://localhost:3000
echo  [+] Trinh duyet   : Tu dong mo sau 3 giay...
echo  [+] Dung server   : Nhan Ctrl + C tai cua so nay
echo ===================================================================
echo.

:: Tu dong mo trinh duyet sau 3 giay
start "" /b powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'"

:: Khoi chay Next.js dev server
call npm run dev

pause
