@echo off
echo ==========================================
echo DANG BUILD WEB (Tao ban moi nhat)...
echo ==========================================
rmdir /s /q dist
call npm run build


echo.
echo ==========================================
echo DANG UPLOAD LEN SERVER (Nhap mat khau VPS neu duoc hoi)...
echo ==========================================
scp -r dist/* root@180.93.3.41:/var/www/aiquangcao/

echo.
echo ==========================================
echo DANG CAP NHAT QUYEN TRUY CAP...
echo ==========================================
ssh root@180.93.3.41 "chown -R www-data:www-data /var/www/aiquangcao && chmod -R 755 /var/www/aiquangcao"

echo.
echo ==========================================
echo XONG! WEB DA DUOC CAP NHAT.
echo ==========================================
pause
