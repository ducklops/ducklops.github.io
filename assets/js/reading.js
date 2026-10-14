/* DUCKLOPS — Reading modes for Readables
   Builds the "Reading mode" menu into any [data-readmode] bar and applies the
   choice to <html data-read="…">. Remembered for this visit only (sessionStorage).
   Only Readables pages load this file, so nothing changes anywhere else. */
(function () {
  "use strict";
  var root = document.documentElement;
  var MODE_KEY = "ducklops-read", TINT_KEY = "ducklops-tint";

  var MODES = [
    { id: "off", name: "Standard", desc: "The site's normal look." },
    { id: "stress", name: "Visual stress (Irlen's)", desc: "A coloured page you pick, softer contrast, no busy patterns." },
    { id: "dyslexia", name: "Dyslexia", desc: "Andika font, cream page, extra space between letters, words and lines." },
    { id: "tracking", name: "Tracking (ADHD)", desc: "Longer lines and lots more space between them, so it's easier to stay on the right line." }
  ];
  var TINTS = [
    { id: "yellow", name: "Yellow", c: "#fbf3c8" }, { id: "peach", name: "Peach", c: "#fbe2cf" },
    { id: "rose", name: "Rose", c: "#f7dde3" }, { id: "lilac", name: "Lilac", c: "#e7dff2" },
    { id: "blue", name: "Blue", c: "#dbe7f6" }, { id: "aqua", name: "Aqua", c: "#d5efec" },
    { id: "green", name: "Green", c: "#e0efd6" }, { id: "grey", name: "Grey", c: "#e5e4e0" }
  ];

  function get(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  function valid(list, id, fallback) { return list.some(function (x) { return x.id === id; }) ? id : fallback; }

  var mode = valid(MODES, get(MODE_KEY), "off");
  var tint = valid(TINTS, get(TINT_KEY), "yellow");

  function apply() {
    if (mode === "off") root.removeAttribute("data-read"); else root.setAttribute("data-read", mode);
    root.setAttribute("data-tint", tint);
    set(MODE_KEY, mode); set(TINT_KEY, tint);
  }
  apply();

  function nameOf(id) { for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i].name.replace(/ \(.*\)$/, ""); return ""; }

  var n = 0;
  document.querySelectorAll("[data-readmode]").forEach(function (bar) {
    var uid = "read-" + (++n);
    bar.classList.add("read-bar");
    bar.innerHTML =
      '<button type="button" class="read-btn" aria-expanded="false" aria-controls="' + uid + '">' +
        '<span class="read-aa" aria-hidden="true">Aa</span>Reading mode: <b data-read-current></b><span aria-hidden="true">▾</span></button>' +
      '<div class="read-panel" id="' + uid + '" hidden>' +
        '<fieldset class="read-modes"><legend>Reading mode</legend>' +
          MODES.map(function (m) {
            return '<label class="read-opt"><input type="radio" name="' + uid + '-mode" value="' + m.id + '">' +
              "<span><b>" + m.name + "</b><small>" + m.desc + "</small></span></label>";
          }).join("") +
        "</fieldset>" +
        '<fieldset class="read-tints" hidden><legend>Page colour</legend><div class="tint-row">' +
          TINTS.map(function (t) {
            return '<label class="tint" title="' + t.name + '"><input type="radio" name="' + uid + '-tint" value="' + t.id + '" aria-label="' + t.name + '">' +
              '<span style="--sw:' + t.c + '"></span></label>';
          }).join("") +
        "</div></fieldset>" +
        '<p class="read-note">Remembered for this visit only, and only here on Readables. Try a few tints: the right one is different for everyone.</p>' +
      "</div>";

    var btn = bar.querySelector(".read-btn"), panel = bar.querySelector(".read-panel");
    var tintBox = bar.querySelector(".read-tints"), current = bar.querySelector("[data-read-current]");

    function paint() {
      current.textContent = nameOf(mode);
      bar.querySelectorAll('input[name="' + uid + '-mode"]').forEach(function (r) { r.checked = r.value === mode; });
      bar.querySelectorAll('input[name="' + uid + '-tint"]').forEach(function (r) { r.checked = r.value === tint; });
      tintBox.hidden = mode !== "stress";
    }
    function open(yes) {
      panel.hidden = !yes; btn.setAttribute("aria-expanded", yes ? "true" : "false");
      if (yes) { var c = panel.querySelector("input:checked") || panel.querySelector("input"); if (c) c.focus(); }
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); open(panel.hidden); });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    panel.addEventListener("change", function (e) {
      var t = e.target;
      if (t.name === uid + "-mode") mode = t.value;
      if (t.name === uid + "-tint") tint = t.value;
      apply(); paintAll();
    });
    document.addEventListener("click", function () { if (!panel.hidden) open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { open(false); btn.focus(); } });
    bar._paint = paint;
    paint();
  });
  function paintAll() { document.querySelectorAll("[data-readmode]").forEach(function (b) { if (b._paint) b._paint(); }); }
})();
