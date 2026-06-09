# Vellox - Configurador de Impressao Automatica
# Execute como Administrador

$appUrl = "https://www.appvellox.online"
$chromePath = ""

# Localiza o Chrome instalado
$possiveisCaminhos = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

foreach ($caminho in $possiveisCaminhos) {
    if (Test-Path $caminho) {
        $chromePath = $caminho
        break
    }
}

if (-not $chromePath) {
    Write-Host ""
    Write-Host "ERRO: Google Chrome nao encontrado." -ForegroundColor Red
    Write-Host "Instale o Chrome em: https://www.google.com/chrome" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host ""
Write-Host "=== Vellox - Configurador de Impressao ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Chrome encontrado: $chromePath" -ForegroundColor Green

$argumentos = "--kiosk-printing --app=$appUrl --start-maximized --disable-infobars --no-first-run"

# Cria atalho na Area de Trabalho
$desktopPath = [System.Environment]::GetFolderPath("Desktop")
$atalhoDesktop = "$desktopPath\Vellox PDV.lnk"

$shell = New-Object -ComObject WScript.Shell
$atalho = $shell.CreateShortcut($atalhoDesktop)
$atalho.TargetPath = $chromePath
$atalho.Arguments = $argumentos
$atalho.Description = "Vellox PDV - Impressao Automatica"
$atalho.WorkingDirectory = "C:\Program Files\Google\Chrome\Application"
$atalho.Save()

Write-Host "Atalho criado na Area de Trabalho." -ForegroundColor Green

# Adiciona ao Startup do Windows (inicia automaticamente com o Windows)
$startupPath = [System.Environment]::GetFolderPath("Startup")
$atalhoStartup = "$startupPath\Vellox PDV.lnk"

$atalhoInicio = $shell.CreateShortcut($atalhoStartup)
$atalhoInicio.TargetPath = $chromePath
$atalhoInicio.Arguments = $argumentos
$atalhoInicio.Description = "Vellox PDV - Impressao Automatica"
$atalhoInicio.WorkingDirectory = "C:\Program Files\Google\Chrome\Application"
$atalhoInicio.Save()

Write-Host "Configurado para iniciar automaticamente com o Windows." -ForegroundColor Green

# Define impressora padrao (lista as disponiveis)
Write-Host ""
Write-Host "=== Impressoras disponiveis ===" -ForegroundColor Cyan
$impressoras = Get-Printer | Select-Object -ExpandProperty Name
$i = 1
foreach ($imp in $impressoras) {
    $padrao = (Get-Printer -Name $imp).Default
    if ($padrao) {
        Write-Host "  [$i] $imp  <- PADRAO ATUAL" -ForegroundColor Yellow
    } else {
        Write-Host "  [$i] $imp"
    }
    $i++
}

Write-Host ""
Write-Host "Digite o numero da impressora termica para definir como padrao (ou ENTER para manter atual):" -ForegroundColor Cyan
$escolha = Read-Host

if ($escolha -match '^\d+$') {
    $indice = [int]$escolha - 1
    if ($indice -ge 0 -and $indice -lt $impressoras.Count) {
        $impressoraSelecionada = $impressoras[$indice]
        (Get-WmiObject Win32_Printer -Filter "Name='$impressoraSelecionada'").SetDefaultPrinter() | Out-Null
        Write-Host "Impressora padrao definida: $impressoraSelecionada" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Configuracao concluida!" -ForegroundColor Green
Write-Host ""
Write-Host "Use o atalho 'Vellox PDV' na Area de Trabalho." -ForegroundColor White
Write-Host "O app abrira automaticamente quando o Windows iniciar." -ForegroundColor White
Write-Host ""
pause
