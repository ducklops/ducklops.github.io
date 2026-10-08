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

  // ---------- banner + pop-up (switched on/off in config.js) ----------
  var C = window.DUCKLOPS_CONFIG || {};
  var BASE = document.body.getAttribute("data-base") || "";
  function siteHref(u) { return !u || /^([a-z]+:|\/|#)/i.test(u) ? u : BASE + u; }
  function external(u) { return /^https?:/i.test(u); }

  // scrolling marquee banner across the top
  var bn = C.banner || {};
  var bnMsgs = [].concat(bn.messages || bn.text || []).filter(Boolean);
  if (bn.on && bnMsgs.length) {
    var bar = document.createElement("div");
    bar.className = "marquee";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    var track = document.createElement(bn.link ? "a" : "div");
    track.className = "marquee-track";
    if (bn.link) {
      track.href = siteHref(bn.link);
      if (external(bn.link)) { track.target = "_blank"; track.rel = "noopener"; }
    }
    var sr = document.createElement("span");          // screen readers get the plain text once
    sr.className = "sr-only";
    sr.textContent = bnMsgs.join(" — ");
    track.appendChild(sr);
    bar.appendChild(track);
    var skip = document.querySelector(".skip");
    document.body.insertBefore(bar, skip ? skip.nextSibling : document.body.firstChild);

    var runOnce = function () {
      var frag = document.createDocumentFragment();
      bnMsgs.forEach(function (m) {
        var t = document.createElement("span"); t.className = "marquee-msg"; t.textContent = m;
        var d = document.createElement("img"); d.className = "marquee-sep px"; d.src = BASE + "assets/img/duck.svg"; d.alt = "";
        frag.appendChild(t); frag.appendChild(d);
      });
      return frag;
    };
    var layout = function () {
      track.querySelectorAll(".marquee-run").forEach(function (r) { r.remove(); });
      var run = document.createElement("span");
      run.className = "marquee-run"; run.setAttribute("aria-hidden", "true");
      run.appendChild(runOnce());
      track.appendChild(run);
      // repeat the messages until one run is wider than the screen, so the loop never shows a gap
      var single = run.scrollWidth || 1, reps = Math.max(1, Math.ceil(window.innerWidth / single));
      for (var i = 1; i < reps; i++) run.appendChild(runOnce());
      track.appendChild(run.cloneNode(true));
      var w = run.scrollWidth;
      track.style.animationDuration = Math.max(6, w / (+bn.speed || 60)) + "s";
    };
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    var lastW = window.innerWidth, rt;
    window.addEventListener("resize", function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(layout, 200);
    });
  }

  // pop-up notice, shown once per visitor (per id)
  var pp = C.popup || {};
  if (pp.on && pp.message && (!pp.homeOnly || BASE === "")) {
    var seenKey = "ducklops-popup-" + (pp.id || "notice");
    if (!store.get(seenKey)) {
      setTimeout(function () {
        store.set(seenKey, "1");
        var back = document.createElement("div");
        back.className = "popup-backdrop";
        var box = document.createElement("div");
        box.className = "popup";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-labelledby", "popup-title");
        box.innerHTML =
          '<div class="win-bar"><img class="px" src="' + BASE + 'assets/img/duck.svg" alt="">' +
          '<span class="win-title" id="popup-title"></span>' +
          '<span class="win-btns"><button type="button" data-popup-close aria-label="Close">×</button></span></div>' +
          '<div class="popup-body"><img class="popup-icon px" src="' + BASE + 'assets/img/bell.svg" alt=""><div class="popup-text"></div></div>' +
          '<div class="popup-btns"></div>';
        box.querySelector(".win-title").textContent = pp.title || "NOTICE.TXT";
        var txt = box.querySelector(".popup-text");
        String(pp.message).split(/\n+/).forEach(function (line) {
          var p = document.createElement("p"); p.textContent = line; txt.appendChild(p);
        });
        var btns = box.querySelector(".popup-btns");
        if (pp.link) {
          var go = document.createElement("a");
          go.className = "btn"; go.href = siteHref(pp.link); go.textContent = pp.linkText || "Take a look";
          if (external(pp.link)) { go.target = "_blank"; go.rel = "noopener"; }
          go.addEventListener("click", function () { close(); });
          btns.appendChild(go);
        }
        var ok = document.createElement("button");
        ok.type = "button"; ok.className = "btn btn--green"; ok.textContent = pp.button || "OK";
        ok.setAttribute("data-popup-close", "");
        btns.appendChild(ok);
        back.appendChild(box);

        var prevFocus = document.activeElement;
        function onKey(e) {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {                              // keep Tab inside the box
            var f = box.querySelectorAll("a, button"), first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }
        function close(quackIt) {
          if (!back.parentNode) return;
          if (quackIt) quackSound(1.2);
          back.remove();
          document.removeEventListener("keydown", onKey);
          if (prevFocus && prevFocus.focus) prevFocus.focus();
        }
        box.querySelectorAll("[data-popup-close]").forEach(function (b) {
          b.addEventListener("click", function () { close(b === ok); });
        });
        back.addEventListener("click", function (e) { if (e.target === back) close(); });
        document.addEventListener("keydown", onKey);
        document.body.appendChild(back);
        ok.focus();
      }, Math.max(0, +pp.delay || 0) * 1000);
    }
  }

  // ---------- YouTube thumbnails: fall back if maxres isn't there ----------
  document.querySelectorAll("img[data-yt]").forEach(function (img) {
    img.addEventListener("error", function () {
      if (img.src.indexOf("maxresdefault") !== -1) img.src = img.src.replace("maxresdefault", "hqdefault");
    });
  });
})();
