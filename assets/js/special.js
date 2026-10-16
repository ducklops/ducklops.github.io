/* =====================================================================
   DUCKLOPS — EVENT MODE STAGE  (/special/)
   The countdown, the clicking digits, and the pyro + confetti at release.
   Everything it shows comes from config.js -> nextVideo (via event.js).

   Testing: /special/?demo            pretend the video drops in 15 seconds
            /special/?demo&in=90      ...in 90 seconds
            /special/?demo&live       pretend it has just dropped
            &title=...&url=...        try a different title / link
   ===================================================================== */
(function () {
  "use strict";
  var E = window.DucklopsEvent;
  if (!E || E.redirecting) return;
  var C = window.DUCKLOPS_CONFIG || {};
  var ROOT = E.root;
  var q = new URLSearchParams(location.search);
  var demo = q.has("demo");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ---------- what are we counting down to? ---------- */
  var ev = E.info();
  if (demo) {
    var inSec = q.has("live") ? -2 : Math.max(1, +q.get("in") || 15);
    var r = Date.now() + inSec * 1000;
    var url = q.get("url") || (ev && ev.url) || "";
    var id = E.ytId(url);
    url = id ? "https://youtu.be/" + id : url;
    ev = {
      release: r, start: r - E.LEAD, end: r + E.TAIL,
      title: q.get("title") || (ev && ev.title) || "Your next video",
      url: url, videoId: id,
      watchUrl: url || (C.channelUrl || "https://youtube.com/@ducklops").replace(/\/+$/, "") + "/videos",
      enabled: true
    };
  } else {
    var ph = E.phase(ev);
    if (!ev || !ev.enabled || (ph !== "countdown" && ph !== "live")) {   // nothing on right now
      location.replace(ROOT);
      return;
    }
  }

  /* ---------- "Just take me to the site" ---------- */
  var from = q.get("from") || "";
  var dest = /^\/(?!\/)/.test(from) && !/^\/special\b/.test(from) ? from : ROOT;
  $$("[data-ev-skip]").forEach(function (a) {
    a.href = dest;
    a.addEventListener("click", function (e) {
      if (demo) return;
      if (!E.skip(ev)) {                     // storage blocked: tell the next page directly
        e.preventDefault();
        location.href = dest + (dest.indexOf("?") < 0 ? "?" : "&") + "noevent";
      }
    });
  });

  /* ---------- fill in the words ---------- */
  var title = ev.title || "New video";
  $("[data-ev-title]").textContent = title;
  var watch = $("[data-ev-watch]");
  watch.href = ev.watchUrl;
  var remind = $("[data-ev-remind]");
  if (ev.url) {                                // the premiere page has YouTube's own "Notify me" button
    remind.href = ev.url;
    $("[data-ev-remind-label]").textContent = "Set a reminder";
  }
  var dayFmt = { weekday: "short", day: "numeric", month: "short" };
  var timeFmt = { hour: "numeric", minute: "2-digit" };
  var rel = new Date(ev.release);
  var whenTxt = rel.toLocaleDateString("en-GB", dayFmt) + ", " + rel.toLocaleTimeString("en-GB", timeFmt).replace(/^0/, "");
  $("[data-ev-when]").textContent = "Drops " + whenTxt + " your time";
  var statusEl = $("[data-ev-status]");
  var announce = $("[data-ev-announce]");

  /* ---------- sound (off until someone asks for it) ---------- */
  var SND = "ducklops-event-sound", ac = null;
  function soundOn() { try { return window.localStorage.getItem(SND) === "1"; } catch (e) { return false; } }
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }
  var tock = false;
  function clickSound() {                     // a little relay click, tick... tock...
    if (!soundOn()) return;
    var a = audio(); if (!a) return;
    var t = a.currentTime, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = "square"; o.frequency.value = (tock = !tock) ? 1650 : 1250;
    f.type = "highpass"; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(f); f.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.04);
  }
  function boom(delay, size) {                // filtered noise thump + crackle
    if (!soundOn()) return;
    var a = audio(); if (!a) return;
    var t = a.currentTime + (delay || 0), len = 1.4, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) {
      var k = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.4) * (k > 0.18 && Math.random() < 0.02 ? 3 : 1);
    }
    var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = "lowpass"; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.6);
    g.gain.value = 0.35 * (size || 1);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t);
  }
  function fanfare() {                        // three rising chiptune notes
    if (!soundOn()) return;
    var a = audio(); if (!a) return;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (hz, i) {
      var t = a.currentTime + i * 0.13, o = a.createOscillator(), g = a.createGain();
      o.type = "square"; o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (i === 3 ? 0.6 : 0.14));
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.65);
    });
  }
  var sndBtn = $("[data-ev-sound]");
  function paintSound() {
    var on = soundOn();
    sndBtn.setAttribute("aria-pressed", on ? "true" : "false");
    $("[data-ev-sound-icon]").textContent = on ? "🔊" : "🔈";
    $("[data-ev-sound-label]").textContent = on ? "Sound on" : "Sound off";
  }
  sndBtn.addEventListener("click", function () {
    try { window.localStorage.setItem(SND, soundOn() ? "0" : "1"); } catch (e) {}
    paintSound();
    if (soundOn()) { audio(); clickSound(); }
  });
  paintSound();

  /* ---------- the clicking countdown ---------- */
  var tiles = $$(".fd");
  var timer = $("[data-ev-timer]");
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function show(str, quiet) {
    var changed = false;
    tiles.forEach(function (tile, i) {
      var b = tile.firstElementChild, ch = str.charAt(i);
      if (b.textContent === ch) return;
      b.textContent = ch; changed = true;
      if (quiet || reduce) return;
      tile.classList.remove("tick"); void tile.offsetWidth; tile.classList.add("tick");
    });
    if (changed && !quiet) clickSound();
  }
  var live = false, first = true, lastMin = -1;
  function loop() {
    var now = Date.now(), ms = ev.release - now;
    if (ms > 0) {
      var s = Math.ceil(ms / 1000);
      var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      show(pad(Math.min(d, 99)) + pad(h) + pad(m) + pad(sec), first);
      timer.setAttribute("aria-label", "Time left: " + (d ? d + " days, " : "") + h + " hours, " + m + " minutes, " + sec + " seconds");
      document.title = pad(h + d * 24) + ":" + pad(m) + ":" + pad(sec) + " · " + title;
      if (m !== lastMin) {                     // a gentle spoken update once a minute, not every second
        lastMin = m;
        statusEl.textContent = (demo ? "Preview · " : "") + (s > 3600 ? "On air soon" : s > 600 ? "Nearly time" : "Any second now");
      }
      first = false;
      setTimeout(loop, (ms % 1000 || 1000) + 15);
    } else {
      show("00000000", first);
      if (!live) goLive(!first);
      first = false;
    }
  }

  function goLive(rightNow) {
    live = true;
    document.body.classList.add("is-live");
    $("[data-ev-head]").textContent = "OUT NOW!";
    $("[data-ev-wintitle]").textContent = "PREMIERE.EXE";
    $("[data-ev-kicker]").textContent = "DucklopsOS // it's here";
    $("[data-ev-tag]").textContent = "Go go go!";
    statusEl.textContent = (demo ? "Preview · " : "") + "Live now";
    watch.hidden = false;
    remind.hidden = true;
    timer.setAttribute("aria-label", "The video is out now");
    document.title = "OUT NOW! · " + title;
    announce.textContent = "It's out! " + title + ". The Watch it now button opens it on YouTube.";
    celebrate(true);
    if (rightNow) { fanfare(); }
    startShow();
    setTimeout(function () { try { watch.focus({ preventScroll: true }); } catch (e) {} }, 400);
  }

  /* =====================================================================
     PYRO + CONFETTI (one canvas, chunky pixels to suit the 90s look)
     ===================================================================== */
  var cv = $(".fx"), cx = cv && cv.getContext && cv.getContext("2d");
  var P = [], gerbs = [], running = false, W = 0, H = 0, dpr = 1, MAX = 1100;
  function size() {
    if (!cx) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); window.addEventListener("resize", size);
  function palette(name) {
    var v = getComputedStyle(document.body).getPropertyValue(name);
    var list = v.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    return list.length ? list : ["#43c767", "#ffd23f", "#ffffff"];
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var floorY = function () { return H * 0.86; };

  function confetti(x, y, n, angle, spread, power) {
    var cols = palette("--fx-confetti");
    for (var i = 0; i < n && P.length < MAX; i++) {
      var a = angle + rnd(-spread, spread), v = power * rnd(0.55, 1.1);
      P.push({ k: 0, x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(6, 11), h: rnd(4, 8),
        r: rnd(0, 6.28), vr: rnd(-0.25, 0.25), sw: rnd(0, 6.28), c: pick(cols), life: rnd(260, 420) });
    }
  }
  function rain(n) {
    var cols = palette("--fx-confetti");
    for (var i = 0; i < n && P.length < MAX; i++) {
      P.push({ k: 0, x: rnd(0, W), y: rnd(-60, -10), vx: rnd(-0.6, 0.6), vy: rnd(1, 2.4), w: rnd(6, 11), h: rnd(4, 8),
        r: rnd(0, 6.28), vr: rnd(-0.2, 0.2), sw: rnd(0, 6.28), c: pick(cols), life: 600 });
    }
  }
  function spark(x, y, vx, vy, col, life, size) {
    if (P.length >= MAX) return;
    P.push({ k: 1, x: x, y: y, vx: vx, vy: vy, c: col, life: life, max: life, s: size || 2 });
  }
  function gerb(x, ms) { gerbs.push({ x: x, until: performance.now() + ms }); }   // a stage fountain
  function rocket(x, delay) {
    setTimeout(function () {
      if (P.length >= MAX) return;
      P.push({ k: 2, x: x, y: floorY(), vx: rnd(-0.6, 0.6), vy: -rnd(H * 0.0135, H * 0.0165) - 4, c: pick(palette("--fx-pyro")), fuse: rnd(38, 52) });
      boom(0.05, 0.25);
      run();
    }, delay || 0);
  }
  function burst(x, y) {
    var cols = palette("--fx-pyro"), conf = palette("--fx-confetti"), n = 70, base = rnd(2.4, 3.8);
    var main = pick(conf);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rnd(-0.05, 0.05), v = base * rnd(0.85, 1.15);
      spark(x, y, Math.cos(a) * v, Math.sin(a) * v, i % 3 ? main : pick(cols), rnd(55, 85), 3);
    }
    for (var j = 0; j < 26; j++) spark(x, y, rnd(-1.6, 1.6), rnd(-1.6, 1.6), "#ffffff", rnd(20, 40), 2);
    boom(0, 0.8);
  }

  function celebrate(big) {
    if (reduce || !cx) return;
    if (big) { var f = $(".flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
    var fy = floorY();
    confetti(-10, fy, big ? 170 : 60, -1.05, 0.32, H * 0.026);          // confetti cannons from both wings
    confetti(W + 10, fy, big ? 170 : 60, -2.09, 0.32, H * 0.026);
    rain(big ? 160 : 40);
    var spots = W < 640 ? [0.12, 0.88] : [0.08, 0.27, 0.73, 0.92];
    spots.forEach(function (p) { gerb(W * p, big ? 3200 : 1600); });
    var shells = big ? (W < 640 ? 4 : 7) : 2;
    for (var i = 0; i < shells; i++) rocket(W * rnd(0.12, 0.88), 250 + i * rnd(260, 420));
    boom(0, big ? 1.2 : 0.6);
    run();
  }

  // while it's live: a light confetti drizzle, and a bit more pyro now and then
  function startShow() {
    if (reduce || !cx) return;
    var t0 = Date.now();
    setInterval(function () { if (!document.hidden) { rain(2); run(); } }, 260);
    (function more() {
      var gap = Date.now() - t0 < 3 * 60 * 1000 ? 7000 : 18000;
      setTimeout(function () { if (!document.hidden) celebrate(false); more(); }, gap);
    })();
  }

  function run() { if (!running && cx) { running = true; requestAnimationFrame(frame); } }
  function frame(now) {
    cx.clearRect(0, 0, W, H);
    // stage fountains
    gerbs = gerbs.filter(function (g) {
      if (now > g.until) return false;
      var cols = palette("--fx-pyro");
      for (var i = 0; i < 6; i++) spark(g.x + rnd(-4, 4), floorY(), rnd(-1.3, 1.3), -rnd(H * 0.011, H * 0.017), pick(cols), rnd(45, 75), rnd(2, 3.5));
      return true;
    });
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i];
      if (p.k === 0) {                         // confetti: tumbling paper
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.07; p.sw += 0.07; p.r += p.vr;
        p.x += p.vx + Math.sin(p.sw) * 0.6; p.y += p.vy; p.life--;
        if (p.y > H + 20 || p.life <= 0) { P.splice(i, 1); continue; }
        var fl = Math.abs(Math.cos(p.r)), hh = Math.max(1, Math.round(p.h * fl));
        cx.globalCompositeOperation = "source-over";
        cx.globalAlpha = Math.min(1, p.life / 40);
        cx.fillStyle = p.c;
        cx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), hh);
        if (fl < 0.35) { cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), hh); }
      } else if (p.k === 1) {                  // pyro sparks
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.06; p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) { P.splice(i, 1); continue; }
        var a = p.life / p.max;
        cx.globalCompositeOperation = "lighter";
        cx.globalAlpha = a > 0.3 ? 1 : a / 0.3 * (Math.random() < 0.85 ? 1 : 0.2);   // crackle as they die
        cx.fillStyle = p.c;
        var s = Math.max(1, Math.round(p.s * (0.5 + a / 2)));
        cx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      } else {                                 // rockets on their way up
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.fuse--;
        cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 1; cx.fillStyle = p.c;
        cx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
        if (Math.random() < 0.8) spark(p.x, p.y + 3, rnd(-0.4, 0.4), rnd(0.5, 1.5), p.c, rnd(10, 22), 2);
        if (p.fuse <= 0 || p.vy >= -0.5) { P.splice(i, 1); burst(p.x, p.y); }
      }
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    if (P.length || gerbs.length) requestAnimationFrame(frame);
    else { running = false; cx.clearRect(0, 0, W, H); }
  }

  /* ---------- go ---------- */
  loop();
  // after the 30 minutes, anyone still here can stay; new visitors get the normal site again
})();
