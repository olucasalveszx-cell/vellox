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

echo  Instalando dependencias (aguarde ~1 min)...
cd /d "%DIR%"
call npm install --quiet 2>nul

echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$pub = Invoke-WebRequest 'https://www.appvellox.online/api/print-server/public-config' | ConvertFrom-Json;" ^
  "Write-Host '';" ^
  "Write-Host '=== Configuracao ===' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host 'Abra o site appvellox.online -> Configuracoes' -ForegroundColor Yellow;" ^
  "Write-Host 'Copie o ID da empresa exibido no card de impressao.' -ForegroundColor Yellow;" ^
  "Write-Host '';" ^
  "$id   = Read-Host 'Cole aqui o ID da empresa';" ^
  "$nome = Read-Host 'Nome da empresa';" ^
  "Write-Host '';" ^
  "Write-Host 'Impressoras instaladas:' -ForegroundColor Yellow;" ^
  "Get-Printer | ForEach-Object { Write-Host '  ' $_.Name };" ^
  "Write-Host '';" ^
  "$imp = Read-Host 'Nome exato da impressora termica (ENTER = padrao do sistema)';" ^
  "$cfg = [ordered]@{ supabase_url=$pub.supabase_url; supabase_anon_key=$pub.supabase_anon_key; empresa_id=$id; empresa_nome=$nome; printer_name=$imp };" ^
  "$cfg | ConvertTo-Json | Out-File -Encoding utf8 '%DIR%\config.json';" ^
  "('@echo off','cd /d C:\VelloxPrintServer','node index.js') -join \"`r`n\" | Out-File -Encoding ascii '%DIR%\iniciar.bat';" ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s  = $ws.CreateShortcut([Environment]::GetFolderPath('Startup') + '\Vellox Print Server.lnk');" ^
  "$s.TargetPath = '%DIR%\iniciar.bat'; $s.WindowStyle = 7; $s.Save();" ^
  "Write-Host '';" ^
  "Write-Host '==========================================' -ForegroundColor Green;" ^
  "Write-Host '  Instalado! Inicia automaticamente.' -ForegroundColor Green;" ^
  "Write-Host '==========================================';"

echo.
echo  Iniciando servidor...
start /min cmd /k "cd /d C:\VelloxPrintServer && node index.js"
pause
