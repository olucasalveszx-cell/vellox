@echo off
title Vellox - Configurar Impressao
color 0A
echo.
echo  ================================
echo   Vellox - Configurar Impressao
echo  ================================
echo.

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
    echo  ERRO: Google Chrome nao encontrado!
    echo  Instale o Chrome em google.com/chrome e tente novamente.
    echo.
    pause
    exit /b 1
)

echo  Chrome encontrado!
echo.

set "ARGS=--kiosk --kiosk-printing --disable-print-preview https://www.appvellox.online/pedidos"
set "DESK=%USERPROFILE%\Desktop\Vellox PDV.lnk"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Vellox PDV.lnk"

powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%DESK%'); $s.TargetPath='%CHROME%'; $s.Arguments='%ARGS%'; $s.Save()"
powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%STARTUP%'); $s.TargetPath='%CHROME%'; $s.Arguments='%ARGS%'; $s.Save()"

echo  Pronto! Configuracao concluida.
echo.
echo  - Atalho "Vellox PDV" criado na Area de Trabalho
echo  - App abre automaticamente quando o PC ligar
echo.
pause
