@echo off
title Vellox - Configurar Impressao
color 0A
echo.
echo  ================================
echo   Vellox - Configurar Impressao
echo  ================================
echo.

:: Localiza o Chrome
set CHROME=""
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if %CHROME%=="" (
    echo  ERRO: Google Chrome nao encontrado!
    echo  Instale o Chrome e tente novamente.
    echo.
    pause
    exit /b 1
)

echo  Chrome encontrado!
echo.

:: Cria atalho na Area de Trabalho via PowerShell
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%USERPROFILE%\Desktop\Vellox PDV.lnk');$s.TargetPath=%CHROME%;$s.Arguments='--kiosk-printing --app=https://www.appvellox.online --start-maximized --disable-infobars --no-first-run';$s.Description='Vellox PDV';$s.Save()"

:: Adiciona ao startup do Windows
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Vellox PDV.lnk');$s.TargetPath=%CHROME%;$s.Arguments='--kiosk-printing --app=https://www.appvellox.online --start-maximized --disable-infobars --no-first-run';$s.Description='Vellox PDV';$s.Save()"

echo  Pronto! Configuracao concluida.
echo.
echo  - Atalho "Vellox PDV" criado na Area de Trabalho
echo  - App abre automaticamente quando o PC ligar
echo.
echo  Abra pelo atalho "Vellox PDV" para imprimir sem janelas.
echo.
pause
