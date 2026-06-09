@echo off
title Vellox - Servidor de Impressao
color 0A
echo.
echo  =========================================
echo   Vellox - Servidor de Impressao Local
echo  =========================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
  echo  ERRO: Node.js nao encontrado!
  echo  Baixe em: nodejs.org e tente novamente.
  pause & exit /b 1
)

set "DIR=C:\VelloxPrintServer"
if not exist "%DIR%" mkdir "%DIR%"

echo  Baixando servidor...
powershell -NoProfile -Command "Invoke-WebRequest 'https://www.appvellox.online/print-server/index.js' -OutFile '%DIR%\index.js'"
powershell -NoProfile -Command "Invoke-WebRequest 'https://www.appvellox.online/print-server/package.json' -OutFile '%DIR%\package.json'"

echo  Instalando dependencias (aguarde)...
cd /d "%DIR%"
npm install --quiet 2>nul

echo.
echo  Baixando sua configuracao do site...
powershell -NoProfile -Command "Invoke-WebRequest 'https://www.appvellox.online/api/print-server/config' -OutFile '%DIR%\config.json'"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "if (-not (Test-Path '%DIR%\config.json')) { Write-Host 'ERRO: Faca login no site antes de executar este instalador.' -ForegroundColor Red; exit 1 };" ^
  "$cfg = Get-Content '%DIR%\config.json' | ConvertFrom-Json;" ^
  "if (-not $cfg.empresa_id) { Write-Host 'ERRO: Faca login em appvellox.online antes de instalar.' -ForegroundColor Red; Read-Host; exit 1 };" ^
  "Write-Host '';" ^
  "Write-Host ('Empresa: ' + $cfg.empresa_nome) -ForegroundColor Green;" ^
  "Write-Host '';" ^
  "Write-Host 'Impressoras instaladas:' -ForegroundColor Yellow;" ^
  "Get-Printer | ForEach-Object { Write-Host '  ' $_.Name };" ^
  "Write-Host '';" ^
  "$imp = Read-Host 'Nome da impressora termica (ENTER = padrao do sistema)';" ^
  "$cfg | Add-Member -MemberType NoteProperty -Name printer_name -Value $imp -Force;" ^
  "$cfg | ConvertTo-Json | Out-File -Encoding utf8 '%DIR%\config.json';" ^
  "('@echo off', 'cd /d C:\VelloxPrintServer', 'node index.js') -join \"`r`n\" | Out-File -Encoding ascii '%DIR%\iniciar.bat';" ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut([Environment]::GetFolderPath('Startup') + '\Vellox Print Server.lnk');" ^
  "$s.TargetPath = '%DIR%\iniciar.bat'; $s.WindowStyle = 7; $s.Save();" ^
  "Write-Host '';" ^
  "Write-Host '==========================================' -ForegroundColor Green;" ^
  "Write-Host '  Pronto! Servidor instalado com sucesso.' -ForegroundColor Green;" ^
  "Write-Host '  Inicia automaticamente com o Windows.' -ForegroundColor Green;" ^
  "Write-Host '=========================================='"

echo.
echo  Iniciando servidor agora...
start /min cmd /c "cd /d C:\VelloxPrintServer && node index.js"
echo  Servidor rodando! A janela ficara minimizada.
echo.
pause
