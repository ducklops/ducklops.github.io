/* =====================================================================
   DUCKLOPS — EVENT MODE
   Runs in the <head> of every page, straight after config.js.

   For the 6 hours before nextVideo.date, and for 30 minutes after it,
   anyone who opens the site is taken to /special/ (the countdown stage).
   It switches itself on and off by the clock: nothing to do on the day.

   Your only inputs live in config.js -> nextVideo (or the Console):
     date       release time, UK time, e.g. "2026-10-18T16:30"
     label      the video title
     url        the YouTube link (optional; without it "Watch now" goes to the channel)
     eventMode  false = skip Event Mode for this video
   ===================================================================== */
(function () {
  "use strict";

  var LEAD = 6 * 60 * 60 * 1000;   // starts 6 hours before release
  var TAIL = 30 * 60 * 1000;       // ends 30 minutes after release
  var SKIP_KEY = "ducklops-event-skip";

  // the site's root folder, worked out from where this script lives
  var me = document.currentScript && document.currentScript.src;
  var ROOT = me ? me.replace(/assets\/js\/event\.js(?:[?#].*)?$/, "") : "/";

  /* ---------- UK wall-clock time -> exact moment ----------
     config dates are written in UK time, so a viewer in New York or Sydney
     still gets the right countdown (and BST/GMT is handled for you). */
  function londonOffset(t) {          // how far London is ahead of UTC at moment t (ms)
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London", hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
      }).formatToParts(new Date(t));
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second);
      return asUTC - Math.floor(t / 1000) * 1000;
    } catch (e) {
      return -new Date(t).getTimezoneOffset() * 60000;   // very old browser: use the viewer's own clock
    }
  }
  function ukTime(str) {
    str = String(str || "").trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(str);
    if (!m) { var d = Date.parse(str); return isNaN(d) ? null : d; }   // already has a timezone, or junk
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    var t = guess - londonOffset(guess);
    var again = guess - londonOffset(t);                                // settles the BST/GMT changeover hour
    return again;
  }

  function ytId(v) {
    v = String(v || "").trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : "";
  }

  /* ---------- what's scheduled ---------- */
  function info(cfg) {
    var C = cfg || window.DUCKLOPS_CONFIG || {};
    var nv = C.nextVideo || {};
    var release = ukTime(nv.date);
    if (release == null) return null;
    var id = ytId(nv.url);
    var url = id ? "https://youtu.be/" + id : (/^https?:\/\//i.test(nv.url || "") ? nv.url : "");
    var channel = (C.channelUrl || "https://youtube.com/@ducklops").replace(/\/+$/, "");
    return {
      release: release,
      start: release - LEAD,
      end: release + TAIL,
      title: String(nv.label || "").trim(),
      url: url,
      videoId: id,
      watchUrl: url || channel + "/videos",
      enabled: nv.eventMode !== false
    };
  }
  function phase(ev, now) {
    if (!ev) return "none";
    now = now == null ? Date.now() : now;
    if (now < ev.start) return "before";
    if (now < ev.release) return "countdown";
    if (now < ev.end) return "live";
    return "after";
  }
  function skipped(ev) {
    try { return window.sessionStorage.getItem(SKIP_KEY) === String(ev.release); } catch (e) { return false; }
  }
  function skip(ev) {          // "Just take me to the site": don't bounce this tab back again
    try { window.sessionStorage.setItem(SKIP_KEY, String(ev.release)); return skipped(ev); } catch (e) { return false; }
  }

  var api = window.DucklopsEvent = {
    LEAD: LEAD, TAIL: TAIL, root: ROOT,
    ukTime: ukTime, ytId: ytId, info: info, phase: phase, skip: skip, skipped: skipped
  };

  /* ---------- the automatic part ---------- */
  var ev = info();
  if (!ev || !ev.enabled) return;
  var p = phase(ev);
  if (p !== "countdown" && p !== "live") return;

  var path = location.pathname;
  if (/\/(special|admin)(\/|\/index\.html)?$/.test(path) || /\/(special|admin)\//.test(path)) return;
  if (/[?&]noevent\b/.test(location.search)) return;
  if (skipped(ev)) return;
  if (/bot|crawl|spider|slurp|facebookexternalhit|embedly|lighthouse|preview/i.test(navigator.userAgent || "")) return;

  // only when someone *opens* the site: clicking around inside it doesn't bounce you
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin) return;
  } catch (e) {}

  api.redirecting = true;
  location.replace(ROOT + "special/?from=" + encodeURIComponent(path + location.search + location.hash));
})();
