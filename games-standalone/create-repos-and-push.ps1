#Requires -Version 5.1
<#
.SYNOPSIS
  Создаёт на GitHub три публичных репозитория (если их ещё нет) и пушит игры из этой папки.

.DESCRIPTION
  Нужен Personal Access Token (classic) с правом **repo**.
  Создай: GitHub → Settings → Developer settings → Personal access tokens.

  В PowerShell ПЕРЕД запуском:
    $env:GITHUB_TOKEN = "ghp_xxxxxxxx"

  Запуск (из папки games-standalone):
    .\create-repos-and-push.ps1

  После пуша: в каждом репозитории Settings → Pages → branch **main**, folder **/ (root)**.

  ВАЖНО: не коммить токен в git и не делиться скриншотами с переменной.
#>

$ErrorActionPreference = "Stop"
$GitHubUser = "zab1yak"

if (-not $env:GITHUB_TOKEN) {
  Write-Host "Задай токен: `$env:GITHUB_TOKEN = 'ghp_...'" -ForegroundColor Yellow
  Write-Host "Подробности в комментарии в начале этого скрипта."
  exit 1
}

$token = $env:GITHUB_TOKEN.Trim()
$headers = @{
  Authorization = "Bearer $token"
  Accept        = "application/vnd.github+json"
  "User-Agent"  = "goncharov-portfolio-deploy"
}

$games = @(
  @{ Name = "minesweeper-game"; Folder = "minesweeper-game"; Desc = "Browser Minesweeper (HTML/CSS/JS)" }
  @{ Name = "snake-game"; Folder = "snake-game"; Desc = "Browser Snake on Canvas (HTML/CSS/JS)" }
  @{ Name = "asteroids-game"; Folder = "asteroids-game"; Desc = "Browser Asteroids arcade (HTML/CSS/JS)" }
)

$root = $PSScriptRoot

function Test-RepoExists($repoName) {
  $uri = "https://api.github.com/repos/$GitHubUser/$repoName"
  try {
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Get | Out-Null
    return $true
  } catch {
    if ($_.Exception.Response.StatusCode -eq 404) { return $false }
    throw
  }
}

function New-GitHubRepo($repoName, $description) {
  $body = @{
    name        = $repoName
    description = $description
    homepage    = "https://$GitHubUser.github.io/$repoName/"
    private     = $false
    auto_init   = $false
  } | ConvertTo-Json

  Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json; charset=utf-8"
}

foreach ($g in $games) {
  $repo = $g.Name
  $dir = Join-Path $root $g.Folder

  if (-not (Test-Path $dir)) {
    Write-Host "Пропуск: нет папки $dir" -ForegroundColor Red
    continue
  }

  Write-Host "`n=== $repo ===" -ForegroundColor Cyan

  if (Test-RepoExists $repo) {
    Write-Host "Репозиторий уже есть: $GitHubUser/$repo"
  } else {
    Write-Host "Создаю репозиторий..."
    New-GitHubRepo $repo $g.Desc | Out-Null
    Write-Host "Готово: https://github.com/$GitHubUser/$repo"
  }

  Push-Location $dir
  try {
    if (-not (Test-Path .git)) {
      git init
    }
    git add -A
    $st = git status --porcelain
    if ($st) {
      git commit -m "Initial commit: $repo"
    } else {
      Write-Host "Нет изменений для коммита (уже закоммичено)."
    }
    git branch -M main 2>$null

    git remote remove origin 2>$null
    $remoteUrl = "https://x-access-token:${token}@github.com/${GitHubUser}/${repo}.git"
    git remote add origin $remoteUrl
    git push -u origin main
    Write-Host "Push выполнен." -ForegroundColor Green
  } finally {
    Pop-Location
  }
}

Write-Host "`nДальше: на github.com открой каждый репозиторий → Settings → Pages → Source: main, / (root)." -ForegroundColor Yellow
Write-Host "Токен лучше сбросить: удалить `$env:GITHUB_TOKEN и при необходимости отозвать на GitHub." -ForegroundColor Yellow
