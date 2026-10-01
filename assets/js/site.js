/* DUCKLOPS — shared behaviour for every page */
(function () {
  "use strict";

  // ---------- tiny storage helpers (never throw) ----------
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    sget: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- synthesised quack (no audio files needed) ----------
  var ctx = null;
  function muted() { return store.get("ducklops-muted") === "1"; }
  function quackSound(pitch) {
    if (muted()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var t = ctx.currentTime, p = pitch || 1;
      var osc = ctx.createOscillator(), filt = ctx.createBiquadFilter(), gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(520 * p, t);
      osc.frequency.exponentialRampToValueAtTime(240 * p, t + 0.16);
      filt.type = "bandpass"; filt.frequency.value = 1100 * p; filt.Q.value = 2.2;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.22);
    } catch (e) {}
  }

  var LINES = ["Quack!", "QUACK", "quack?", "Subscribe!", "Got bread?", "Wak wak", "*flap flap*", "Hello!"];
  function quack(el, text, pitch) {
    quackSound(pitch);
    if (!el) return;
    var old = el.querySelector(".quack"); if (old) old.remove();
    var b = document.createElement("span");
    b.className = "quack";
    b.textContent = text || LINES[Math.floor(Math.random() * LINES.length)];
    // keep the speech bubble readable when the duck is facing left (mirrored)
    try {
      var m = getComputedStyle(el).transform;
      var a = m && m !== "none" ? parseFloat(m.split("(")[1]) : 1;
      el.style.setProperty("--flip", a < 0 ? -1 : 1);
    } catch (e) {}
    el.appendChild(b);
    setTimeout(function () { b.remove(); }, 950);
  }

  window.Ducklops = { quack: quack, quackSound: quackSound, store: store, muted: muted,
    setMuted: function (m) { store.set("ducklops-muted", m ? "1" : "0"); } };

  // ---------- footer ducks ----------
  document.querySelectorAll(".footer-duck").forEach(function (d) {
    d.addEventListener("click", function () { quack(d, null, d.classList.contains("d2") ? 1.5 : 1); });
  });

  // ---------- year ----------
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- little joke pop-ups (DuckPad menu on AI.TXT) ----------
  document.querySelectorAll("[data-quip]").forEach(function (btn) {
    btn.addEventListener("click", function () { quack(btn, btn.getAttribute("data-quip"), 1.25); });
  });

  // ---------- "achievement unlocked" toast, once per visit ----------
  document.querySelectorAll("[data-achievement]").forEach(function (box) {
    var key = "ducklops-ach-" + box.getAttribute("data-achievement");
    if (store.sget(key)) return;
    store.sset(key, "1");
    setTimeout(function () {
      box.hidden = false;
      setTimeout(function () { box.hidden = true; }, 4700);
    }, 700);
  });

  // ---------- copy buttons ----------
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var out = document.getElementById(btn.getAttribute("data-copy-out"));
      function done(ok) { if (out) { out.textContent = ok ? "Copied to clipboard ✓" : text; } }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });
  });

  // ---------- generic text filter (Corrections search) ----------
  document.querySelectorAll("[data-filter-input]").forEach(function (input) {
    var scope = document.querySelector(input.getAttribute("data-filter-input"));
    if (!scope) return;
    var items = scope.querySelectorAll("[data-filter-item]");
    var empty = scope.querySelector("[data-filter-empty]");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase(), shown = 0;
      items.forEach(function (it) {
        var hit = !q || it.textContent.toLowerCase().indexOf(q) !== -1;
        it.hidden = !hit; if (hit) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  });

  // ---------- YouTube thumbnails: fall back if maxres isn't there ----------
  document.querySelectorAll("img[data-yt]").forEach(function (img) {
    img.addEventListener("error", function () {
      if (img.src.indexOf("maxresdefault") !== -1) img.src = img.src.replace("maxresdefault", "hqdefault");
    });
  });
})();
