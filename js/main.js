(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
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

  /* --- Tilt tiles + mouser (CodePen-style) --- */
  var tileEls = document.querySelectorAll(".tile");
  var x = 0;
  var y = 0;
  var currX = 0;
  var currY = 0;
  var mouserEl = document.createElement("div");
  mouserEl.className = "mouser";
  mouserEl.setAttribute("aria-hidden", "true");
  document.body.appendChild(mouserEl);

  document.addEventListener(
    "mousemove",
    function (event) {
      var e = event.touches ? event.touches[0] : event;
      x = e.clientX;
      y = e.clientY;
      if (isFinePointer) document.body.classList.add("show-mouser");
    },
    { passive: true }
  );

  if (tileEls.length && !prefersReducedMotion && isFinePointer) {
    Array.prototype.forEach.call(tileEls, function (tileEl) {
      tileEl.addEventListener("mouseenter", function () {
        document.body.style.setProperty("--over", "1");
      });
      tileEl.addEventListener("mouseleave", function () {
        document.body.style.setProperty("--over", "0");
      });
    });

    function updateTilt() {
      requestAnimationFrame(function () {
        currX += (x - currX) * 0.15;
        currY += (y - currY) * 0.15;
        var w = window.innerWidth;
        var h = window.innerHeight;
        var rotX = (currY / h) * -2 + 1;
        var rotY = (currX / w) * 2 - 1;
        document.body.style.setProperty("--mouse-x", String(currX));
        document.body.style.setProperty("--mouse-y", String(currY));
        document.body.style.setProperty("--rot-x", String(rotX));
        document.body.style.setProperty("--rot-y", String(rotY));
        updateTilt();
      });
    }
    updateTilt();
  } else {
    document.body.style.setProperty("--rot-x", "0");
    document.body.style.setProperty("--rot-y", "0");
    document.body.style.setProperty("--mouse-x", String(window.innerWidth / 2));
    document.body.style.setProperty("--mouse-y", String(window.innerHeight / 2));
  }
})();
