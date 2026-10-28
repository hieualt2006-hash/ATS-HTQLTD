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

:: Giai phong cong 3000 neu co tien trinh cu dang chiem
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    echo [*] Dang don dep tien trinh cu tren cong 3000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: Xoa sach cache .next de tranh loi xung dot manifest va mat CSS
if exist ".next" (
    echo [*] Dang lam sach cache .next de nap day du CSS va icon moi nhat...
    rmdir /s /q ".next" >nul 2>&1
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
