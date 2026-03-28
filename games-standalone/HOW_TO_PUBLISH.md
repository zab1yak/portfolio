# Как выложить каждую игру отдельным репозиторием на GitHub

У тебя три **независимые** папки — каждая = один репозиторий на GitHub со своим README.

Аккаунт: [github.com/zab1yak](https://github.com/zab1yak). Я **не могу** зайти в твой GitHub от твоего имени (нет доступа к паролю и сессии). На ПК часто нет `gh` CLI — поэтому есть **один скрипт** под Windows.

## Вариант «один раз» — PowerShell (создаёт репозитории и пушит)

1. Создай **Personal Access Token (classic)** с галочкой **repo**:  
   GitHub → **Settings** → **Developer settings** → **Personal access tokens**.
2. Открой PowerShell в папке `games-standalone`:
   ```powershell
   $env:GITHUB_TOKEN = "вставь_сюда_токен_ghp_..."
   .\create-repos-and-push.ps1
   ```
3. В каждом новом репозитории: **Settings → Pages →** ветка **main**, папка **/ (root)**.
4. Закрой сессию: `$env:GITHUB_TOKEN = $null` и при желании **отзови токен** на GitHub.

Скрипт: `create-repos-and-push.ps1` (лежит рядом с этим файлом).

---

## Рекомендуемые имена репозиториев

| Папка              | Имя репозитория на GitHub   | После GitHub Pages (пример)                    |
|--------------------|-----------------------------|------------------------------------------------|
| `minesweeper-game` | `minesweeper-game`          | `https://zab1yak.github.io/minesweeper-game/`  |
| `snake-game`       | `snake-game`                | `https://zab1yak.github.io/snake-game/`        |
| `asteroids-game`   | `asteroids-game`            | `https://zab1yak.github.io/asteroids-game/`    |

Имена можно изменить; тогда обнови ссылки **«Играть online»** в основном портфолио (`index.html`).

## Вариант A: через сайт GitHub

1. **New repository** → имя, например `minesweeper-game`, без README (он уже есть локально).
2. В папке `minesweeper-game` на компьютере:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Minesweeper browser game"
   git branch -M main
   git remote add origin https://github.com/zab1yak/minesweeper-game.git
   git push -u origin main
   ```
3. Повтори для `snake-game` и `asteroids-game` в **их** папках (отдельный `git init` в каждой).

## Вариант B: GitHub CLI (`gh`)

```bash
cd minesweeper-game
git init && git add . && git commit -m "Initial commit"
gh repo create minesweeper-game --public --source=. --remote=origin --push
```

## Включить GitHub Pages

Для **каждого** репозитория:

1. **Settings → Pages**
2. **Build and deployment:** Deploy from a branch  
3. Branch: **main**, folder: **/ (root)**  
4. Сохрани. Через минуту появится URL вида `https://zab1yak.github.io/<repo>/`

Убедись, что в корне лежит `index.html` (так и есть в этих папках).

## Портфолио

В `goncharov-portfolio/index.html` ссылки «Играть online» ведут на эти Pages-URL. После первого деплоя проверь, что все три ссылки открываются.
