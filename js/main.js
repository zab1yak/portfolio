(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const HEADER_OFFSET = 72;
  const LOADER_MIN_MS = 2000;

  const I18N = window.PORTFOLIO_I18N || { ru: {}, en: {} };

  function getStoredLang() {
    var s = localStorage.getItem("portfolioLang");
    if (s === "en" || s === "ru") return s;
    return "ru";
  }

  function setStoredLang(lang) {
    localStorage.setItem("portfolioLang", lang);
  }

  function applyPortfolioLang(lang) {
    if (lang !== "en" && lang !== "ru") lang = "ru";
    var t = I18N[lang];
    if (!t) return;

    document.documentElement.lang = lang === "en" ? "en" : "ru";

    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t.metaDescription);
    var titleEl = document.querySelector("title");
    if (titleEl) titleEl.textContent = t.title;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (key && t[key] != null) el.textContent = t[key];
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (key && t[key] != null) el.innerHTML = t[key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (key && t[key] != null) el.setAttribute("placeholder", t[key]);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (key && t[key] != null) el.setAttribute("aria-label", t[key]);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria-label");
      if (key && t[key] != null) el.setAttribute("aria-label", t[key]);
    });

    var subj = document.getElementById("form-subject");
    if (subj && t.formSubject) subj.value = t.formSubject;

    var algo = document.getElementById("skill-link-algorithms");
    if (algo && t.wikiAlgorithms) algo.href = t.wikiAlgorithms;
    var team = document.getElementById("skill-link-team");
    if (team && t.wikiTeam) team.href = t.wikiTeam;

    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      var isActive = btn.getAttribute("data-set-lang") === lang;
      btn.classList.toggle("lang-switch__btn--active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    setupHeroTypewriter();
  }

  function setupHeroTypewriter() {
    var tw = document.getElementById("hero-typewriter");
    if (!tw) return;
    if (prefersReducedMotion) {
      tw.style.animation = "none";
      tw.style.width = "auto";
      tw.style.borderRight = "none";
      tw.style.overflow = "visible";
      return;
    }
    var text = tw.textContent.trim();
    var len = Math.max(1, Array.from(text).length);
    tw.style.animation = "none";
    tw.style.width = "0";
    tw.style.overflow = "hidden";
    tw.style.borderRight = "";
    tw.style.setProperty("--tw-steps", String(len));
    void tw.offsetHeight;
    tw.style.removeProperty("animation");
  }

  applyPortfolioLang(getStoredLang());

  /* --- Page loader --- */
  var loader = document.getElementById("page-loader");
  if (loader && !prefersReducedMotion) {
    document.body.classList.add("is-loading");
    var loaderStart = Date.now();
    function hideLoader() {
      var elapsed = Date.now() - loaderStart;
      var wait = Math.max(0, LOADER_MIN_MS - elapsed);
      window.setTimeout(function () {
        loader.classList.add("page-loader--done");
        document.body.classList.remove("is-loading");
        window.setTimeout(function () {
          loader.setAttribute("aria-hidden", "true");
          loader.setAttribute("aria-busy", "false");
        }, 500);
      }, wait);
    }
    if (document.readyState === "complete") {
      hideLoader();
    } else {
      window.addEventListener("load", hideLoader);
    }
  } else if (loader) {
    loader.classList.add("page-loader--done");
    loader.setAttribute("aria-hidden", "true");
    loader.setAttribute("aria-busy", "false");
  }

  /* --- Language toggle --- */
  document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var lang = btn.getAttribute("data-set-lang");
      if (lang !== "en" && lang !== "ru") return;
      setStoredLang(lang);
      applyPortfolioLang(lang);
    });
  });

  /* --- Theme --- */
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  const systemLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  if (stored === "light" || stored === "dark") {
    root.dataset.theme = stored;
  } else {
    root.dataset.theme = systemLight ? "light" : "dark";
  }

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      localStorage.setItem("theme", next);
    });
  });

  /* --- Year --- */
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  /* --- Smooth scroll (anchor links) --- */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothScrollTo(targetY, duration) {
    var start = window.scrollY;
    var dist = targetY - start;
    var startTime = null;
    var dur = duration != null ? duration : Math.min(1400, Math.max(700, Math.abs(dist) * 0.65));

    function step(ts) {
      if (startTime === null) startTime = ts;
      var p = Math.min(1, (ts - startTime) / dur);
      var eased = easeOutCubic(p);
      window.scrollTo(0, start + dist * eased);
      if (p < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      if (!href || href === "#" || href.length < 2) return;
      var el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      if (prefersReducedMotion) {
        window.scrollTo(0, top);
      } else {
        smoothScrollTo(top);
      }
      if (document.body.classList.contains("is-drawer-open")) {
        var drawer = document.getElementById("mobile-drawer");
        var burger = document.querySelector(".nav-burger");
        if (drawer) drawer.hidden = true;
        if (burger) burger.setAttribute("aria-expanded", "false");
        document.body.classList.remove("is-drawer-open");
      }
    });
  });

  /* --- Mobile drawer --- */
  var burger = document.querySelector(".nav-burger");
  var drawer = document.getElementById("mobile-drawer");
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = !drawer.hidden;
      drawer.hidden = open;
      burger.setAttribute("aria-expanded", String(!open));
      document.body.classList.toggle("is-drawer-open", !open);
    });
    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        drawer.hidden = true;
        burger.setAttribute("aria-expanded", "false");
        document.body.classList.remove("is-drawer-open");
      });
    });
  }

  /* --- Scroll reveal --- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) {
      if (!el.classList.contains("is-visible")) io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* --- Cursor glow --- */
  var glow = document.querySelector(".cursor-glow");
  if (glow && isFinePointer && !prefersReducedMotion) {
    var gx = 0;
    var gy = 0;
    var gcx = 0;
    var gcy = 0;
    var rafG = null;
    function loopGlow() {
      gcx += (gx - gcx) * 0.08;
      gcy += (gy - gcy) * 0.08;
      glow.style.transform = "translate3d(" + gcx + "px, " + gcy + "px, 0)";
      rafG = requestAnimationFrame(loopGlow);
    }
    window.addEventListener(
      "mousemove",
      function (e) {
        gx = e.clientX;
        gy = e.clientY;
        if (!rafG) rafG = requestAnimationFrame(loopGlow);
      },
      { passive: true }
    );
  }

  /* --- Background parallax zoom (pointer) --- */
  var pageBg = document.querySelector(".page-bg");
  if (pageBg && isFinePointer && !prefersReducedMotion) {
    window.addEventListener(
      "mousemove",
      function (e) {
        var nx = (e.clientX / window.innerWidth - 0.5) * 2;
        var ny = (e.clientY / window.innerHeight - 0.5) * 2;
        pageBg.style.setProperty("--bg-tx", (nx * 1.2).toFixed(2) + "%");
        pageBg.style.setProperty("--bg-ty", (ny * 1.2).toFixed(2) + "%");
      },
      { passive: true }
    );
  }
})();
