@echo off
chcp 65001 >nul
title ATS - He Thong Quan Ly Tuyen Dung (Dev Server)

cd /d "%~dp0"

echo ===================================================================
echo     HE THONG QUAN LY TUYEN DUNG ATS-HTQLTD (Dev Server)
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

echo [*] Dang don dep cac tien trinh Node cu va giai phong cong 3000...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*ATS-HTQLTD*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: Giai phong cuong che port 3000 neu con tien trinh nao khac chiem dung
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)

if not exist "node_modules" (
    echo [*] Chua tim thay node_modules, dang chay npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [LOI] Cai dat dependencies that bai!
        pause
        exit /b 1
    )
)

echo [*] Dang lam sach cache .next de nap day du code va giao dien moi nhat...
if exist ".next" (
    rmdir /s /q ".next" >nul 2>&1
)

echo [*] Dang dong bo Prisma Client...
call npx prisma generate >nul 2>&1

echo.
echo ===================================================================
echo  [+] Localhost URL : http://localhost:3000
echo  [+] Trinh duyet   : Tu dong mo sau 3 giay
echo  [+] Dung server   : Nhan Ctrl + C hoac dong cua so nay
echo ===================================================================
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'"

call npx next dev -p 3000

pause
