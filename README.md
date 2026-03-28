# Портфолио · Денис Гончаров (Denis Goncharov)

Персональный лендинг: кто я, чем занимаюсь, проекты, контакты. Сайт **публичный** — им может воспользоваться любой человек по ссылке (GitHub Pages).

**Живой сайт:** [zab1yak.github.io/portfolio](https://zab1yak.github.io/portfolio/)

На сайте есть переключатель **RU / EN** (язык запоминается в браузере).

---

## Кто я (коротко для тех, кто открыл репозиторий)

**Денис Гончаров** — студент **ПГНИУ** (Пермский государственный национальный исследовательский университет), экономический факультет, направление **«Прикладная математика и информатика»** (2 курс), Пермь.

Пишу **Python**-ботов для Telegram, занимаюсь **вёрсткой и небольшими сайтами**, делаю **браузерные игры** на HTML/CSS/JS, в учёбе использую **C++**, **C#**, **F#**, **R**. Есть **учебная практика в GreenData**, командный проект — **учёт посещаемости** для вуза. Участвовал в олимпиадах и образовательных программах (в т.ч. Stepik, «Открытый университет» Пермского политеха) — детали на самом сайте в блоке «Обо мне».

**Открыт к заказам:** боты, скрипты, простые лендинги. На GitHub: [@zab1yak](https://github.com/zab1yak).

**Связь:** [Telegram @zab1l](https://t.me/zab1l) · `zab1rabota@gmail.com`

---

## English (for international visitors)

**Denis Goncharov** — BSc student in *Applied Mathematics and Informatics* at Perm State University (economics track), Perm, Russia. I build **Telegram bots** (Python), **websites**, **browser games** (HTML/CSS/JS), and use **C++ / C# / F# / R** in coursework. **GreenData** internship, team **attendance app** for the university. See the live site for awards, projects, and contact links.

---

## Технологии этого репозитория

Статический сайт: **HTML**, **CSS**, **JavaScript** (без React/Vite). Тёмная и светлая тема, плавный скролл по якорям, экран загрузки, фон с лёгкой анимацией, форма через [FormSubmit](https://formsubmit.co) на `zab1rabota@gmail.com` (при первой отправке подтвердите почту по письму сервиса).

Переводы интерфейса: **`js/i18n.js`** + **`js/main.js`**.

---

## Браузерные игры (отдельные репозитории на GitHub)

В папке **`games-standalone/`** три готовые мини-игры — **каждая со своим `README.md`**. Их нужно выложить **тремя отдельными репозиториями** (например `minesweeper-game`, `snake-game`, `asteroids-game`) и включить **GitHub Pages**. Пошагово: **`games-standalone/HOW_TO_PUBLISH.md`**.

На лендинге в блоке «Проекты» ссылки ведут на `https://zab1yak.github.io/<имя-репозитория>/` — после первого деплоя демо откроются.

---

## Структура

```
├── index.html
├── css/style.css
├── js/main.js      # тема, язык, меню, скролл, анимации
├── js/i18n.js      # строки RU / EN
├── games-standalone/
│   ├── HOW_TO_PUBLISH.md
│   ├── minesweeper-game/   # index.html, style.css, game.js, README.md
│   ├── snake-game/
│   └── asteroids-game/
└── README.md
```

---

## Локально

```bash
npx --yes serve .
```

---

## Референсы визуала

[benscott.dev](https://benscott.dev/) · [safetpojskic.com](https://safetpojskic.com/) · [CodePen Tilted Tiles](https://codepen.io/Prakash286/pen/bGRdqLw)

---

*Репозиторий: [github.com/zab1yak/portfolio](https://github.com/zab1yak/portfolio)*
