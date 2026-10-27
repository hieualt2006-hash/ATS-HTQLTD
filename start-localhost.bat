@echo off
chcp 65001 >nul
title ATS - Hệ Thống Quản Lý Tuyển Dụng (Dev Server)

:: Chuyển thư mục làm việc về thư mục chứa file .bat này
cd /d "%~dp0"

echo ===================================================================
echo     HỆ THỐNG QUẢN LÝ TUYỂN DỤNG ATS-HTQLTD
echo ===================================================================
echo.
echo [*] Đang kiểm tra môi trường Node.js...

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Không tìm thấy Node.js / npm trong hệ thống!
    echo Vui lòng cài đặt Node.js từ: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Tự động cài đặt thư viện nếu chưa có node_modules
if not exist "node_modules" (
    echo [*] Chưa tìm thấy node_modules, đang chạy npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [LỖI] Cài đặt dependencies thất bại!
        pause
        exit /b 1
    )
)

echo.
echo ===================================================================
echo  [+] Localhost URL : http://localhost:3000
echo  [+] Trình duyệt   : Tự động mở sau 3 giây...
echo  [+] Dừng server   : Nhấn Ctrl + C tại cửa sổ này
echo ===================================================================
echo.

:: Tự động mở trình duyệt sau 3 giây (chạy ngầm để Next.js kịp khởi động)
start "" /b powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'"

:: Khởi chạy Next.js dev server
call npm run dev

pause
