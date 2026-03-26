(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const HEADER_OFFSET = 72;

  /* --- Page loader --- */
  var loader = document.getElementById("page-loader");
  if (loader && !prefersReducedMotion) {
    document.body.classList.add("is-loading");
    var loaderStart = Date.now();
    var minShow = 900;
    function hideLoader() {
      var elapsed = Date.now() - loaderStart;
      var wait = Math.max(0, minShow - elapsed);
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

  /* --- Typing line (hero) --- */
  var tw = document.getElementById("hero-typewriter");
  if (tw && !prefersReducedMotion) {
    var text = tw.textContent.trim();
    var len = Array.from(text).length;
    tw.style.setProperty("--tw-steps", String(Math.max(1, len)));
  } else if (tw) {
    tw.style.animation = "none";
    tw.style.width = "auto";
    tw.style.borderRight = "none";
    tw.style.overflow = "visible";
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
