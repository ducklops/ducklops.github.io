/* DUCKLOPS — the DucklopsOS desktop on the homepage */
(function () {
  "use strict";
  var C = window.DUCKLOPS_CONFIG || {};
  var D = window.Ducklops;
  var monitor = document.querySelector(".monitor");
  var screen = document.querySelector(".screen");
  if (!monitor || !screen) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IMG = monitor.getAttribute("data-img") || "assets/img/";

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function W() { return screen.clientWidth; }
  function H() { return screen.clientHeight; }
  function setSW() { screen.style.setProperty("--sw", W() + "px"); }
  setSW(); window.addEventListener("resize", setSW);

  /* ---------------- clock ---------------- */
  var clock = monitor.querySelector(".clock");
  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    if (clock) clock.textContent = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  tick(); setInterval(tick, 10000);

  /* ---------------- boot sequence (once per visit) ---------------- */
  var boot = monitor.querySelector(".boot");
  function runBoot(force) {
    if (!boot) return;
    if (!force && (reduce || D.store.sget("ducklops-booted"))) return;
    D.store.sset("ducklops-booted", "1");
    var lines = [
      "DUCKLOPS BIOS v2.6  (c) 2026 Ducklops",
      "Memory test ........ 640K OK (should be enough for anyone)",
      "Detecting pond ..... OK",
      "Loading bread.dll .. OK",
      "Counting ducks ..... 5",
      "Starting DucklopsOS"
    ];
    var log = boot.querySelector(".boot-log");
    log.innerHTML = "";
    boot.classList.add("on"); monitor.classList.add("is-booting");
    var i = 0, timer;
    function next() {
      if (i < lines.length) { var p = el("p", null, esc(lines[i])); log.appendChild(p); i++; timer = setTimeout(next, 260); }
      else { var c = el("p", "cursor", ""); log.appendChild(c); timer = setTimeout(finish, 450); }
    }
    function finish() { clearTimeout(timer); boot.classList.remove("on"); monitor.classList.remove("is-booting"); }
    boot.querySelector(".skip-boot").onclick = finish;
    next();
  }
  runBoot(false);

  /* ---------------- power button ---------------- */
  var power = monitor.querySelector(".power");
  if (power) power.addEventListener("click", function () {
    if (monitor.classList.contains("is-off")) {
      monitor.classList.remove("is-off", "powering-down");
      power.setAttribute("aria-label", "Turn the screen off");
      runBoot(true);
    } else {
      monitor.classList.add("powering-down");
      power.setAttribute("aria-label", "Turn the screen on");
      setTimeout(function () { monitor.classList.add("is-off"); }, reduce ? 0 : 560);
    }
  });

  /* ---------------- start menu ---------------- */
  var startBtn = monitor.querySelector(".tb-start"), menu = monitor.querySelector(".start-menu");
  function closeMenu() { if (menu) { menu.hidden = true; startBtn.setAttribute("aria-expanded", "false"); } }
  if (startBtn && menu) {
    startBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.hidden; menu.hidden = !open; startBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { var f = menu.querySelector("a,button"); if (f) f.focus(); }
    });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target)) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    menu.querySelectorAll("[data-action]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-action"); closeMenu();
        if (a === "feed") feed();
        if (a === "shutdown" && power) power.click();
        if (a === "restore") document.querySelectorAll(".dwin").forEach(function (w) { w.hidden = false; w.classList.remove("min"); });
      });
    });
  }

  /* ---------------- sound toggle ---------------- */
  var snd = monitor.querySelector(".tb-sound");
  function paintSound() { if (snd) { snd.textContent = D.muted() ? "🔇" : "🔊"; snd.setAttribute("aria-label", D.muted() ? "Turn quacks on" : "Turn quacks off"); } }
  if (snd) { paintSound(); snd.addEventListener("click", function () { D.setMuted(!D.muted()); paintSound(); if (!D.muted()) D.quackSound(); }); }

  /* ---------------- ticker ---------------- */
  var tickerBox = monitor.querySelector(".ticker");
  var messages = (C.ticker || []).slice();
  var tickerSpan = tickerBox ? tickerBox.querySelector("span") : null;
  var tIdx = 0;
  function pushTicker(msg) { messages.splice(tIdx + 1, 0, msg); }
  function runTicker() {
    if (!tickerSpan || !messages.length) return;
    tickerSpan.textContent = messages[tIdx % messages.length];
    if (reduce) { tickerSpan.style.left = "8px"; tIdx++; setTimeout(runTicker, 5000); return; }
    var boxW = tickerBox.clientWidth, txtW = tickerSpan.scrollWidth;
    var dist = boxW + txtW, dur = dist / 70;
    tickerSpan.animate([{ transform: "translate(0,-50%)" }, { transform: "translate(" + (-dist) + "px,-50%)" }],
      { duration: dur * 1000, easing: "linear" }).onfinish = function () { tIdx++; runTicker(); };
  }
  setTimeout(runTicker, 600);

  /* ---------------- draggable windows + window buttons ---------------- */
  var desktop = monitor.querySelector(".desktop");
  var bigScreen = window.matchMedia("(min-width: 861px)");
  var zTop = 12;
  document.querySelectorAll(".dwin").forEach(function (w) {
    var bar = w.querySelector(".win-bar");
    w.addEventListener("pointerdown", function () { w.style.zIndex = ++zTop; });
    bar.addEventListener("pointerdown", function (e) {
      if (!bigScreen.matches || e.target.closest(".win-btns")) return;
      var r = w.getBoundingClientRect(), dr = desktop.getBoundingClientRect();
      w.style.left = (r.left - dr.left) + "px"; w.style.top = (r.top - dr.top) + "px";
      w.style.right = "auto"; w.style.bottom = "auto"; w.style.transform = "none";
      var ox = e.clientX - r.left, oy = e.clientY - r.top;
      w.classList.add("dragging"); bar.setPointerCapture(e.pointerId);
      function move(ev) {
        var x = Math.max(-r.width + 80, Math.min(dr.width - 80, ev.clientX - dr.left - ox));
        var y = Math.max(-10, Math.min(dr.height - 40, ev.clientY - dr.top - oy));
        w.style.left = x + "px"; w.style.top = y + "px";
      }
      function up() { w.classList.remove("dragging"); bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up); }
      bar.addEventListener("pointermove", move); bar.addEventListener("pointerup", up);
    });
    var minB = w.querySelector("[data-win=min]"), closeB = w.querySelector("[data-win=close]");
    if (minB) minB.addEventListener("click", function () { w.classList.toggle("min"); });
    if (closeB) closeB.addEventListener("click", function () {
      w.hidden = true;
      pushTicker("Closed " + (w.getAttribute("data-name") || "a window") + ". Restore it from the Start menu.");
    });
  });

  /* ---------------- scenery: bubbles ---------------- */
  var scene = monitor.querySelector(".scene");
  for (var b = 0; b < 14; b++) {
    var bub = el("span", "bubble");
    var s = rand(5, 12);
    bub.style.cssText = "left:" + rand(2, 98) + "%;width:" + s + "px;height:" + s + "px;animation-duration:" + rand(7, 15) + "s;animation-delay:-" + rand(0, 15) + "s;--rise:-" + Math.max(300, H() - 200) + "px";
    scene.appendChild(bub);
  }

  /* ---------------- creatures: ducks + fish ---------------- */
  var critters = [];
  function makeDuck(src, cls, speed, pitch) {
    var d = el("button", "duck" + (cls ? " " + cls : ""));
    d.type = "button"; d.setAttribute("aria-label", "A duck. Click to say hello.");
    d.innerHTML = '<img class="px" alt="" src="' + IMG + src + '">';
    scene.appendChild(d);
    var c = { el: d, x: rand(40, W() - 120), dir: Math.random() < 0.5 ? -1 : 1, speed: speed, base: speed, pause: 0, target: null, w: cls === "small" ? 44 : 76, pitch: pitch, kind: "duck" };
    d.addEventListener("click", function () { D.quack(d, null, pitch); c.pause = 60; });
    critters.push(c); return c;
  }
  makeDuck("duck.svg", "", 0.45, 1);
  makeDuck("duck-white.svg", "", 0.35, 0.9);
  makeDuck("duck.svg", "", 0.55, 1.05);
  var kid1 = makeDuck("duckling.svg", "small", 0.5, 1.6);
  var kid2 = makeDuck("duckling.svg", "small", 0.5, 1.7);
  kid1.follow = critters[0]; kid2.follow = kid1;

  function makeFish(src, y, speed) {
    var f = el("div", "fish"); f.innerHTML = '<img class="px" alt="" src="' + IMG + src + '">';
    scene.appendChild(f);
    var c = { el: f, x: rand(0, W()), y: y, dir: -1, speed: speed, kind: "fish", phase: rand(0, 6) };
    critters.push(c); return c;
  }
  makeFish("fish.svg", 0.55, 0.6);
  makeFish("fish2.svg", 0.72, 0.9);
  makeFish("fish.svg", 0.86, 0.4);

  var crumbs = [];
  function feed() {
    var n = 6;
    for (var i = 0; i < n; i++) (function (i) {
      setTimeout(function () {
        var cr = el("span", "crumb"); var x = rand(60, W() - 60);
        cr.style.left = x + "px"; cr.style.top = "-10px"; scene.appendChild(cr);
        var obj = { el: cr, x: x, y: -10 }; crumbs.push(obj);
      }, i * 140);
    })(i);
    critters.forEach(function (c) { if (c.kind === "duck") { c.speed = c.base * 4; c.pause = 0; } });
  }
  var fedCount = 0;
  var breadIcon = monitor.querySelector(".icon.bread");
  if (breadIcon) breadIcon.addEventListener("click", function (e) { e.preventDefault(); feed(); });

  var surfaceY = 118;
  function step() {
    var w = W(), h = H();
    // crumbs fall to the surface
    crumbs.forEach(function (cr) {
      if (cr.y < surfaceY) { cr.y += 3.2; }
      else { cr.y = surfaceY + Math.sin(Date.now() / 300 + cr.x) * 1.5; }
      cr.el.style.transform = "translateY(" + (cr.y + 10) + "px)";
    });
    critters.forEach(function (c) {
      if (c.kind === "duck") {
        if (c.pause > 0) { c.pause--; }
        else {
          var tx = null;
          var floating = crumbs.filter(function (k) { return k.y >= surfaceY - 2; });
          if (floating.length) {
            var best = floating.reduce(function (a, k) { return Math.abs(k.x - (c.x + c.w / 2)) < Math.abs(a.x - (c.x + c.w / 2)) ? k : a; });
            tx = best.x - c.w / 2;
            if (Math.abs(tx - c.x) < 8) {
              crumbs.splice(crumbs.indexOf(best), 1); best.el.remove(); fedCount++;
              D.quack(c.el, "nom", c.pitch * 1.2); c.pause = 30;
              if (!crumbs.length) { critters.forEach(function (d) { if (d.kind === "duck") d.speed = d.base; }); pushTicker("Ducks fed: " + fedCount + " crumbs and counting."); }
              tx = null;
            }
          } else if (c.follow) {
            tx = c.follow.x - c.follow.dir * (c.follow.w + 6);
            if (Math.abs(tx - c.x) < 6) tx = null;
          }
          if (tx != null) { c.dir = tx > c.x ? 1 : -1; c.x += c.dir * Math.min(c.speed * (c.follow ? 1.6 : 1), Math.abs(tx - c.x)); }
          else if (!c.follow) {
            c.x += c.dir * c.speed;
            if (Math.random() < 0.002) c.pause = Math.round(rand(60, 200));
            if (Math.random() < 0.0015) c.dir *= -1;
          }
          if (c.x < 6) { c.x = 6; c.dir = 1; }
          if (c.x > w - c.w - 6) { c.x = w - c.w - 6; c.dir = -1; }
        }
        c.el.style.transform = "translateX(" + c.x + "px) scaleX(" + c.dir + ")";
        c.el.style.setProperty("--flip", c.dir);
      } else {
        c.x += c.dir * c.speed; c.phase += 0.03;
        if (c.x < -70) { c.dir = 1; c.y = rand(0.5, 0.9); }
        if (c.x > w + 20) { c.dir = -1; c.y = rand(0.5, 0.9); }
        var y = Math.max(190, Math.min(h - 110, h * c.y)) + Math.sin(c.phase) * 6;
        // fish sprites face left, so flip when swimming right
        c.el.style.transform = "translate(" + c.x + "px," + y + "px) scaleX(" + (-c.dir) + ")";
      }
    });
    if (!document.hidden && !monitor.classList.contains("is-off")) requestAnimationFrame(step);
    else setTimeout(function () { requestAnimationFrame(step); }, 400);
  }
  // first frame always positions everything; reduced motion = still life
  if (reduce) {
    critters.forEach(function (c) { c.speed = 0; c.base = 0; });
    crumbs.length = 0;
  }
  requestAnimationFrame(step);

  /* ---------------- YouTube: latest video, subscribers, countdown ---------------- */
  function thumbURL(id) { return "https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg"; }
  function paintLatest(v) {
    if (!v || !v.id) return;
    var url = "https://youtu.be/" + v.id;
    document.querySelectorAll("[data-latest-link]").forEach(function (a) { a.href = url; });
    document.querySelectorAll("[data-latest-title]").forEach(function (t) { t.textContent = v.title; });
    document.querySelectorAll("[data-latest-blurb]").forEach(function (t) { if (v.blurb) t.textContent = v.blurb; });
    document.querySelectorAll("[data-latest-thumb]").forEach(function (img) {
      img.onerror = function () { img.onerror = null; img.src = "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg"; };
      img.src = thumbURL(v.id); img.alt = "Thumbnail for " + v.title;
    });
  }
  paintLatest(C.latestVideo);

  var subsLcd = document.querySelector("[data-subs]");
  var subsNote = document.querySelector("[data-subs-note]");
  function fmt(n) { n = +n; return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M" : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "K" : n.toLocaleString("en-GB"); }
  if (window.fetch) {
    /* Stats are written by the GitHub Action (.github/workflows/youtube-stats.yml).
       The API key never reaches the browser. */
    fetch("/assets/data/youtube.json?t=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) {
        if (j.subscriberCount && subsLcd) {
          subsLcd.textContent = fmt(j.subscriberCount);
          if (subsNote) subsNote.textContent = "Fresh from YouTube";
          pushTicker("We're " + fmt(j.subscriberCount) + " ducks strong. Thank you!");
        }
        if (j.latestVideo && j.latestVideo.id) paintLatest(j.latestVideo);
      }).catch(function () {});
  }

  var nextLcd = document.querySelector("[data-next]"), nextNote = document.querySelector("[data-next-note]");
  var nv = C.nextVideo || {};
  if (nextLcd && nv.date) {
    var when = new Date(nv.date);
    if (!isNaN(when)) {
      if (nextNote) nextNote.textContent = nv.label || when.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      var countdown = function () {
        var ms = when - new Date();
        if (ms <= 0) { nextLcd.textContent = "Out now!"; return; }
        var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
        function p(n) { return (n < 10 ? "0" : "") + n; }
        nextLcd.textContent = (d ? d + "d " : "") + p(hh) + ":" + p(mm) + ":" + p(ss);
        setTimeout(countdown, 1000);
      };
      countdown();
      pushTicker("Next video drops " + when.toLocaleDateString("en-GB", { day: "numeric", month: "long" }) + ".");
    }
  }
})();
