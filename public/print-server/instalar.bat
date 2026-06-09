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
echo  Pasta criada: %DIR%

echo  Baixando arquivos...
powershell -NoProfile -Command "Invoke-WebRequest 'https://www.appvellox.online/print-server/index.js' -OutFile '%DIR%\index.js'"
powershell -NoProfile -Command "Invoke-WebRequest 'https://www.appvellox.online/print-server/package.json' -OutFile '%DIR%\package.json'"

echo  Instalando dependencias...
cd /d "%DIR%"
npm install --quiet 2>nul
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url  = Read-Host 'URL do Supabase (ex: https://xxx.supabase.co)';" ^
  "$key  = Read-Host 'Anon Key do Supabase';" ^
  "$id   = Read-Host 'ID da sua empresa (mostrado em Configuracoes no site)';" ^
  "$nome = Read-Host 'Nome da empresa';" ^
  "Write-Host '';" ^
  "Write-Host 'Impressoras instaladas:' -ForegroundColor Yellow;" ^
  "Get-Printer | ForEach-Object { Write-Host '  ' $_.Name };" ^
  "Write-Host '';" ^
  "$imp  = Read-Host 'Nome da impressora termica (ENTER = padrao do sistema)';" ^
  "$cfg  = [ordered]@{ supabase_url=$url; supabase_anon_key=$key; empresa_id=$id; empresa_nome=$nome; printer_name=$imp };" ^
  "$cfg | ConvertTo-Json | Out-File -Encoding utf8 '%DIR%\config.json';" ^
  "('@echo off','cd /d C:\VelloxPrintServer','node index.js') | Out-File -Encoding ascii '%DIR%\iniciar.bat';" ^
  "$ws=$ws=(New-Object -ComObject WScript.Shell);" ^
  "$s=$ws.CreateShortcut([Environment]::GetFolderPath('Startup')+'\Vellox Print Server.lnk');" ^
  "$s.TargetPath='%DIR%\iniciar.bat'; $s.WindowStyle=7; $s.Description='Vellox Print Server'; $s.Save();" ^
  "Write-Host '';" ^
  "Write-Host '=========================================' -ForegroundColor Green;" ^
  "Write-Host '  Instalacao concluida!' -ForegroundColor Green;" ^
  "Write-Host '  O servidor inicia com o Windows.' -ForegroundColor Green;" ^
  "Write-Host '========================================='"

echo.
echo  Iniciando servidor agora...
start /min cmd /c "cd /d C:\VelloxPrintServer && node index.js"
echo  Servidor rodando em segundo plano!
echo.
pause
