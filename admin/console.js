/* =====================================================================
   DUCKLOPS CONSOLE
   Edits the site's settings, Readables, Corrections and Members through
   the GitHub API, then publishes everything as one commit.
   Your GitHub token is only ever kept in this browser.
   ===================================================================== */
(function () {
  "use strict";

  var API = "https://api.github.com";
  var P = {
    config: "assets/js/config.js",
    posts: "readables/posts.js",
    corrections: "corrections/index.html",
    members: "memberships/index.html",
    md: function (slug) { return "readables/posts/" + slug + ".md"; }
  };
  var LS_REPO = "ducklops-console-repo", LS_TOKEN = "ducklops-console-token";

  var S = {
    token: "", repo: "", branch: "main", login: "",
    files: {},            // path -> { sha, text } as loaded
    cfg: null, cfg0: null,
    posts: [], corr: [], members: [],
    md: {},               // slug -> markdown text (only once loaded or written)
    mdDirty: {},          // slug -> true
    mdExists: {},         // slug -> sha of the file in the repo (if any)
    removedSlugs: [],     // posts deleted this session
    dirty: {},            // config / posts / corrections / members -> true
    tab: "videos",
    view: null            // { kind: "post"|"corr", index, isNew }
  };

  /* ---------------- little helpers ---------------- */
  var app = document.getElementById("app");
  var statusEl = document.getElementById("status");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" }[c]; }); }
  function store(kind) { try { return kind === "s" ? window.sessionStorage : window.localStorage; } catch (e) { return null; } }
  function sget(k) { var a = store(), b = store("s"); try { return (a && a.getItem(k)) || (b && b.getItem(k)) || ""; } catch (e) { return ""; } }
  function sset(k, v, session) { try { var s = store(session ? "s" : ""); if (s) { if (v) s.setItem(k, v); else s.removeItem(k); } } catch (e) {} }
  function sdel(k) { try { var a = store(), b = store("s"); if (a) a.removeItem(k); if (b) b.removeItem(k); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function lines(s) { return String(s || "").split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function slugify(t) {
    return String(t || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  function ytId(v) {
    v = String(v || "").trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : "";
  }
  function thumb(id) { return id ? "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" : ""; }
  function toSeconds(label) {
    label = String(label || "").trim(); if (!label) return null;
    if (/^\d+$/.test(label)) return +label;
    var parts = label.split(":"); if (parts.length > 3 || parts.some(function (p) { return !/^\d+$/.test(p); })) return null;
    return parts.reduce(function (t, p) { return t * 60 + (+p); }, 0);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function setStatus(t) { statusEl.textContent = t; }

  /* ---------------- GitHub API ---------------- */
  async function gh(path, opts) {
    opts = opts || {};
    var headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + S.token, "X-GitHub-Api-Version": "2022-11-28" };
    if (opts.body) headers["Content-Type"] = "application/json";
    var r;
    try { r = await fetch(API + path, { method: opts.method || "GET", headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: "no-store" }); }
    catch (e) { var ne = new Error("Couldn't reach GitHub. Check your internet connection."); ne.status = 0; throw ne; }
    if (!r.ok) {
      var msg = ""; try { msg = (await r.json()).message || ""; } catch (e) {}
      var err = new Error(msg || ("GitHub said " + r.status)); err.status = r.status; throw err;
    }
    return r.status === 204 ? null : r.json();
  }
  function encPath(p) { return p.split("/").map(encodeURIComponent).join("/"); }
  async function getFile(path, ref) {
    try {
      var j = await gh("/repos/" + S.repo + "/contents/" + encPath(path) + "?ref=" + encodeURIComponent(ref || S.branch));
      return { sha: j.sha, text: b64decode(j.content || "") };
    } catch (e) { if (e.status === 404) return null; throw e; }
  }

  /* ---------------- reading the site's files ---------------- */
  function evalGlobal(text, name) {
    var w = {};
    new Function("window", "document", text)(w, undefined);   // the repo's own data files
    return w[name];
  }

  function parseCorrections(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    return Array.prototype.map.call(doc.querySelectorAll("#errata article.erratum"), function (a) {
      var th = a.querySelector(".erratum-head a.thumb");
      var h2 = a.querySelector(".erratum-title h2");
      return {
        id: a.id,
        videoId: ytId(th ? th.getAttribute("href") : ""),
        title: h2 ? h2.textContent : "",
        fixes: Array.prototype.map.call(a.querySelectorAll("ul.fixes > li"), function (li) {
          var c = li.cloneNode(true), ts = c.querySelector("a.ts"), tk = c.querySelector(".thanks");
          var f = { time: "", seconds: null, thanks: "", text: "" };
          if (ts) {
            f.time = ts.textContent.trim();
            var m = (ts.getAttribute("href") || "").match(/[?&]t=(\d+)/);
            f.seconds = m ? +m[1] : toSeconds(f.time);
            ts.remove();
          }
          if (tk) { f.thanks = tk.textContent; tk.remove(); }
          f.text = c.textContent;
          return f;
        })
      };
    });
  }
  function parseMembers(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    return Array.prototype.map.call(doc.querySelectorAll("ul.hall-list > li"), function (li) { return li.textContent.trim(); }).filter(Boolean);
  }

  /* ---------------- writing them back ---------------- */
  // find the bracket that closes the one at openIdx, skipping strings and comments
  function findClose(src, openIdx) {
    var open = src[openIdx], close = open === "{" ? "}" : "]", depth = 0, q = null;
    for (var i = openIdx; i < src.length; i++) {
      var c = src[i];
      if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; continue; }
      if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) return -1; continue; }
      if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); if (i < 0) return -1; i++; continue; }
      if (c === '"' || c === "'" || c === "`") { q = c; continue; }
      if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) return i; }
    }
    return -1;
  }
  function valueEnd(src, i) {
    var c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      for (var j = i + 1; j < src.length; j++) { if (src[j] === "\\") { j++; continue; } if (src[j] === c) return j + 1; }
      return -1;
    }
    if (c === "{" || c === "[") { var k = findClose(src, i); return k < 0 ? -1 : k + 1; }
    var m = /^[^,\n\/}\]]*/.exec(src.slice(i));
    return i + m[0].replace(/\s+$/, "").length;
  }
  function serial(v, indent) {
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      return "[\n" + v.map(function (x) { return indent + "  " + JSON.stringify(x); }).join(",\n") + "\n" + indent + "]";
    }
    if (v && typeof v === "object") {
      var ks = Object.keys(v);
      return "{\n" + ks.map(function (k, n) { return indent + "  " + k + ": " + serial(v[k], indent + "  ") + (n < ks.length - 1 ? "," : ""); }).join("\n") + "\n" + indent + "}";
    }
    return JSON.stringify(v === undefined ? "" : v);
  }
  function objRange(src, openIdx) { var e = findClose(src, openIdx); return e < 0 ? null : { start: openIdx + 1, end: e }; }
  function topRange(src) { var m = /window\.DUCKLOPS_CONFIG\s*=\s*\{/.exec(src); return m ? objRange(src, m.index + m[0].length - 1) : null; }
  function blockRange(src, key) {
    var top = topRange(src); if (!top) return null;
    var re = new RegExp("\\n  " + key + "\\s*:\\s*\\{", "g"); re.lastIndex = top.start;
    var m = re.exec(src); if (!m || m.index > top.end) return null;
    return objRange(src, m.index + m[0].length - 1);
  }
  // replace one value in config.js, keeping every comment and the layout around it
  function setValue(src, scope, key, val) {
    var r = scope ? blockRange(src, scope) : topRange(src);
    var indent = scope ? "    " : "  ";
    if (!r) {
      if (!scope) throw new Error("config.js doesn't look like the expected format.");
      var top = topRange(src), block = {}; block[key] = val;
      return src.slice(0, top.start) + "\n\n  " + scope + ": " + serial(block, "  ") + "," + src.slice(top.start);
    }
    var re = new RegExp("\\n" + indent + key + "\\s*:\\s*", "g"); re.lastIndex = r.start;
    var m = re.exec(src);
    if (!m || m.index > r.end) {
      return src.slice(0, r.start) + "\n" + indent + key + ": " + serial(val, indent) + "," + src.slice(r.start);
    }
    var vs = m.index + m[0].length, ve = valueEnd(src, vs);
    if (ve < 0) throw new Error("Couldn't update " + (scope ? scope + "." : "") + key + " in config.js.");
    return src.slice(0, vs) + serial(val, indent) + src.slice(ve);
  }
  var CONFIG_FIELDS = [
    ["latestVideo", ["id", "title", "blurb"]],
    ["nextVideo", ["date", "label", "pushedBack"]],
    ["banner", ["on", "messages", "link", "speed"]],
    ["popup", ["on", "id", "title", "message", "button", "link", "linkText", "homeOnly", "delay"]],
    [null, ["ticker"]]
  ];
  function genConfig() {
    var src = S.files[P.config].text;
    CONFIG_FIELDS.forEach(function (g) {
      var scope = g[0];
      g[1].forEach(function (k) {
        var now = scope ? (S.cfg[scope] || {})[k] : S.cfg[k];
        var was = scope ? (S.cfg0[scope] || {})[k] : S.cfg0[k];
        if (now !== undefined && !same(now, was)) src = setValue(src, scope, k, now);
      });
    });
    var check = evalGlobal(src, "DUCKLOPS_CONFIG");      // make sure we wrote valid JavaScript
    if (!check) throw new Error("config.js check failed.");
    return src;
  }

  var POST_KEYS = ["slug", "title", "videoId", "author", "editor", "date", "tags", "summary", "minutes", "status"];
  function genPosts() {
    var src = S.files[P.posts].text, i = src.indexOf("window.READABLES");
    var head = i >= 0 ? src.slice(0, i) : "";
    var body = S.posts.map(function (p) {
      var keys = POST_KEYS.concat(Object.keys(p).filter(function (k) { return POST_KEYS.indexOf(k) < 0 && k.charAt(0) !== "_"; }));
      var out = [];
      keys.forEach(function (k) {
        var v = p[k];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) return;
        out.push("    " + k + ": " + (Array.isArray(v) ? "[" + v.map(function (x) { return JSON.stringify(x); }).join(", ") + "]" : JSON.stringify(v)));
      });
      return "  {\n" + out.join(",\n") + "\n  }";
    }).join(",\n");
    var res = head + "window.READABLES = [\n" + body + "\n];\n";
    evalGlobal(res, "READABLES");
    return res;
  }

  function genArticle(c) {
    var id = c.videoId, t = esc(c.title), n = c.fixes.length;
    var fixes = c.fixes.map(function (f) {
      var ts = "";
      if (f.time) {
        var s = f.seconds != null ? f.seconds : toSeconds(f.time);
        ts = '<a class="ts" href="https://youtu.be/' + id + "?t=" + s + '" target="_blank" rel="noopener" title="Jump to ' + esc(f.time) + ' on YouTube">' + esc(f.time) + "</a>";
      }
      return "        <li>" + ts + esc(f.text) + (f.thanks ? '<span class="thanks">' + esc(f.thanks) + "</span>" : "") + "</li>";
    }).join("\n");
    return '    <article class="erratum" id="' + esc(c.id) + '" data-filter-item>\n' +
      '      <div class="erratum-head">\n' +
      '        <a class="thumb" href="https://youtu.be/' + id + '" target="_blank" rel="noopener" aria-label="Watch ' + t + '"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + id + "/maxresdefault.jpg\" onerror=\"this.onerror=null;this.src=this.src.replace('maxresdefault','hqdefault')\"><span class=\"play\"><span></span></span></a>\n" +
      '        <div class="erratum-title"><h2>' + t + '</h2><span class="count">' + n + " correction" + (n === 1 ? "" : "s") + "</span></div>\n" +
      "      </div>\n" +
      '      <ul class="fixes">\n' + fixes + "\n      </ul>\n" +
      "    </article>";
  }
  function genCorrections() {
    var src = S.files[P.corrections].text;
    var c0 = src.indexOf("TO ADD A CORRECTION");
    var commentEnd = c0 >= 0 ? src.indexOf("-->", c0) + 3 : -1;
    if (commentEnd < 3) {
      var emptyP = src.indexOf("data-filter-empty");
      commentEnd = src.indexOf("</p>", emptyP) + 4;
    }
    var lastArt = src.lastIndexOf("</article>");
    var end = lastArt > commentEnd ? lastArt + "</article>".length : commentEnd;
    var arts = S.corr.map(genArticle).join("\n");
    src = src.slice(0, commentEnd) + (arts ? "\n\n" + arts : "") + src.slice(end);
    var toc = S.corr.map(function (c) { return '<li><a href="#' + esc(c.id) + '">' + esc(c.title) + "</a></li>"; }).join("");
    src = src.replace(/(<aside class="toc"><h2>Contents<\/h2><ol>)[\s\S]*?(<\/ol>)/, function (_, a, b) { return a + toc + b; });
    var V = S.corr.length, N = S.corr.reduce(function (t, c) { return t + c.fixes.length; }, 0);
    src = src.replace(/<span class="led">[^<]*<\/span>/, '<span class="led">' + V + " video" + (V === 1 ? "" : "s") + " · " + N + " correction" + (N === 1 ? "" : "s") + "</span>");
    return src;
  }
  function genMembers() {
    var src = S.files[P.members].text;
    var lis = S.members.map(function (m) { return "            <li>" + esc(m) + "</li>"; }).join("\n");
    return src.replace(/(<ul class="hall-list">)[\s\S]*?(<\/ul>)/, function (_, a, b) { return a + (lis ? "\n" + lis + "\n          " : "") + b; });
  }

  /* ---------------- what's changed ---------------- */
  function changes() {
    var out = [];
    if (S.dirty.config) out.push({ path: P.config, label: "Site settings", gen: genConfig });
    if (S.dirty.posts) out.push({ path: P.posts, label: "Readables list", gen: genPosts });
    Object.keys(S.mdDirty).forEach(function (slug) {
      if (S.posts.some(function (p) { return p.slug === slug; })) out.push({ path: P.md(slug), label: "Article: " + slug, gen: function () { return String(S.md[slug] || "").replace(/\s*$/, "\n"); } });
    });
    S.removedSlugs.forEach(function (r) {
      if ((!r.soon || S.mdExists[r.slug] !== undefined) && !S.posts.some(function (p) { return p.slug === r.slug; })) out.push({ path: P.md(r.slug), label: "Delete article: " + r.slug, remove: true });
    });
    if (S.dirty.corrections) out.push({ path: P.corrections, label: "Corrections page", gen: genCorrections });
    if (S.dirty.members) out.push({ path: P.members, label: "Members list", gen: genMembers });
    return out;
  }
  function changeCount() { return changes().length; }
  function touch(what) { S.dirty[what] = true; refreshBar(); }

  /* ---------------- sign in ---------------- */
  function renderLogin(msg, kind) {
    var repo = sget(LS_REPO);
    app.innerHTML =
      '<h1 class="display">Console<span class="dot" style="color:var(--green)">.</span></h1>' +
      '<p class="lead" style="margin-bottom:22px">Change the site without touching code. Log on with your GitHub key once and the console remembers it on this device.</p>' +
      (msg ? '<div class="msg ' + (kind || "err") + '">' + esc(msg) + "</div>" : "") +
      '<form id="login">' +
      '<label class="field"><span>Repository</span><input type="text" name="repo" placeholder="your-github-name/ducklops.github.io" value="' + esc(repo) + '" autocomplete="off" spellcheck="false">' +
      '<span class="hint" style="text-transform:none;letter-spacing:0">Leave blank and the console will try to find it.</span></label>' +
      '<label class="field"><span>GitHub key (token)</span><input type="password" name="token" placeholder="github_pat_…" autocomplete="off" spellcheck="false" required></label>' +
      '<label class="check"><input type="checkbox" name="remember" checked> Remember on this device</label>' +
      '<div class="actions"><button class="btn btn--green" type="submit">Log on</button></div>' +
      "</form>" +
      '<details class="how"' + (repo ? "" : " open") + '><summary>First time? How to get your GitHub key</summary><ol class="steps">' +
      '<li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → New fine-grained token</a> (sign in if asked).</li>' +
      "<li><b>Token name:</b> Ducklops console. <b>Expiration:</b> pick the longest you're comfortable with (e.g. 1 year). You'll just make a new one when it runs out.</li>" +
      "<li><b>Repository access:</b> Only select repositories → choose your website repo.</li>" +
      "<li><b>Permissions → Repository permissions → Contents:</b> Read and write. Leave everything else alone.</li>" +
      "<li>Click <b>Generate token</b>, copy it (it starts with <code>github_pat_</code>) and paste it above.</li>" +
      "</ol><p class=\"hint\">The key only lives in this browser. It can only touch your website repo. If you ever think it's leaked, delete it on that same GitHub page and make a new one.</p></details>";
    document.getElementById("login").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      connect(f.repo.value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "").replace(/\.git$/, ""), f.token.value.trim(), f.remember.checked);
    });
  }

  async function connect(repo, token, remember) {
    S.token = token;
    setStatus("Connecting…");
    app.innerHTML = '<p class="kicker">Connecting to GitHub…</p>';
    try {
      var me = await gh("/user");
      S.login = me.login;
      if (!repo) {
        var list = await gh("/user/repos?per_page=100&sort=updated");
        var pick = list.filter(function (r) { return /ducklops/i.test(r.name); });
        if (pick.length !== 1 && list.length === 1) pick = list;
        if (pick.length !== 1) throw Object.assign(new Error("Couldn't work out which repository is the website. Type it in, e.g. " + me.login + "/ducklops.github.io"), { status: -1 });
        repo = pick[0].full_name;
      }
      var info = await gh("/repos/" + repo);
      if (info.permissions && info.permissions.push === false) throw Object.assign(new Error("That key can read the repo but not change it. Give it Contents: Read and write."), { status: -1 });
      S.repo = info.full_name; S.branch = info.default_branch || "main";
      sset(LS_REPO, S.repo);
      sdel(LS_TOKEN); sset(LS_TOKEN, token, !remember);
      await loadAll();
    } catch (e) {
      setStatus("Not connected");
      var m = e.message;
      if (e.status === 401) m = "GitHub didn't accept that key. Check you copied all of it, and that it hasn't expired.";
      else if (e.status === 404) m = "Couldn't find that repository with this key. Check the name, and that the key was given access to it.";
      else if (e.status === 403) m = "GitHub refused: " + e.message;
      if (e.status === 401) sdel(LS_TOKEN);
      renderLogin(m);
    }
  }

  function withDefaults(c) {
    c = c || {};
    c.latestVideo = c.latestVideo || {}; c.nextVideo = c.nextVideo || {};
    c.banner = c.banner || { on: false, messages: [], link: "", speed: 60 };
    c.popup = c.popup || { on: false, id: "notice-1", title: "NOTICE.TXT", message: "", button: "OK", link: "", linkText: "Take a look", homeOnly: true, delay: 1.5 };
    c.ticker = c.ticker || [];
    return c;
  }
  function cfgCheck() { if (same(pick(S.cfg), pick(S.cfg0))) delete S.dirty.config; else S.dirty.config = true; }

  async function loadAll(ref) {
    setStatus("Loading…");
    app.innerHTML = '<p class="kicker">Loading your site…</p>';
    var got = await Promise.all([P.config, P.posts, P.corrections, P.members].map(function (p) { return getFile(p, ref); }));
    var names = [P.config, P.posts, P.corrections, P.members];
    got.forEach(function (f, i) { if (!f) throw Object.assign(new Error("Couldn't find " + names[i] + " in " + S.repo + ". Is this the right repository?"), { status: -1 }); S.files[names[i]] = f; });
    S.cfg = withDefaults(evalGlobal(S.files[P.config].text, "DUCKLOPS_CONFIG"));
    S.cfg0 = withDefaults(evalGlobal(S.files[P.config].text, "DUCKLOPS_CONFIG"));
    S.posts = clone(evalGlobal(S.files[P.posts].text, "READABLES") || []);
    S.corr = parseCorrections(S.files[P.corrections].text);
    S.members = parseMembers(S.files[P.members].text);
    S.md = {}; S.mdDirty = {}; S.mdExists = {}; S.removedSlugs = []; S.dirty = {}; S.view = null;
    setStatus("Connected · " + S.repo);
    render();
  }

  /* ---------------- main screen ---------------- */
  var TABS = [["videos", "Videos"], ["notices", "Banner & pop-up"], ["ticker", "Ticker"], ["readables", "Readables"], ["corrections", "Corrections"], ["members", "Members"]];
  var TAB_DIRTY = { videos: "config", notices: "config", ticker: "config", readables: "posts", corrections: "corrections", members: "members" };

  function render() {
    app.innerHTML =
      '<div class="topbar"><div class="who">Logged on as <b>' + esc(S.login) + "</b> · " + esc(S.repo) +
      ' · <a href="../" target="_blank" rel="noopener">View site ›</a></div>' +
      '<div class="actions" style="margin:0"><button class="btn small" type="button" data-act="discard">Discard changes</button>' +
      '<button class="btn small" type="button" data-act="logoff">Log off</button>' +
      '<button class="btn btn--green" type="button" data-act="publish">Publish<span class="pending" data-pending>0</span></button></div></div>' +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + "</button>";
      }).join("") + "</div>" +
      '<div id="pane"></div>';
    renderPane();
    refreshBar();
  }
  function refreshBar() {
    var n = changeCount();
    var badge = app.querySelector("[data-pending]"); if (badge) badge.textContent = n;
    var pub = app.querySelector('[data-act="publish"]'); if (pub) pub.disabled = !n;
    var dis = app.querySelector('[data-act="discard"]'); if (dis) dis.disabled = !n;
    app.querySelectorAll("[data-tab]").forEach(function (b) {
      var d = TAB_DIRTY[b.getAttribute("data-tab")], on = d === "posts" ? (S.dirty.posts || Object.keys(S.mdDirty).length) : S.dirty[d];
      if (d === "config") on = configTabDirty(b.getAttribute("data-tab"));
      var dot = b.querySelector(".dot");
      if (on && !dot) b.insertAdjacentHTML("beforeend", '<span class="dot" title="Unpublished changes"></span>');
      if (!on && dot) dot.remove();
    });
  }
  function configTabDirty(tab) {
    if (!S.cfg0) return false;
    var groups = { videos: ["latestVideo", "nextVideo"], notices: ["banner", "popup"], ticker: ["ticker"] }[tab];
    return groups.some(function (g) { return !same(S.cfg[g], S.cfg0[g]); });
  }

  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tab]");
    if (t) { S.tab = t.getAttribute("data-tab"); S.view = null; render(); return; }
    var a = e.target.closest("[data-act]"); if (!a) return;
    var act = a.getAttribute("data-act");
    if (act === "logoff") { if (changeCount() && !confirm("You have unpublished changes. Log off anyway?")) return; sdel(LS_TOKEN); S.token = ""; setStatus("Not connected"); renderLogin("Logged off.", "ok"); }
    if (act === "discard") { if (confirm("Throw away everything you haven't published?")) loadAll().catch(fail); }
    if (act === "publish") openPublish();
  });
  function fail(e) { app.insertAdjacentHTML("afterbegin", '<div class="msg err">' + esc(e.message || e) + "</div>"); }

  function renderPane() {
    var pane = document.getElementById("pane");
    ({ videos: paneVideos, notices: paneNotices, ticker: paneTicker, readables: paneReadables, corrections: paneCorrections, members: paneMembers })[S.tab](pane);
  }

  /* generic binding: data-bind="nextVideo.date" data-type="num|bool|lines|yt" */
  function bindInputs(root, onChange) {
    root.querySelectorAll("[data-bind]").forEach(function (el) {
      var path = el.getAttribute("data-bind").split("."), type = el.getAttribute("data-type");
      var obj = S.cfg; for (var i = 0; i < path.length - 1; i++) obj = obj[path[i]] = obj[path[i]] || {};
      var key = path[path.length - 1], v = obj[key];
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = type === "lines" ? (v || []).join("\n") : (v == null ? "" : v);
      el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", function () {
        var nv = el.type === "checkbox" ? el.checked : el.value;
        if (type === "num") nv = nv === "" ? 0 : +nv;
        if (type === "lines") nv = lines(nv);
        if (type === "yt") nv = ytId(nv) || "";
        obj[key] = nv;
        cfgCheck(); refreshBar();
        if (onChange) onChange(el);
      });
    });
  }
  function pick(c) { return { a: c.latestVideo, b: c.nextVideo, c: c.banner, d: c.popup, e: c.ticker }; }
  function switchHTML(path) {
    return '<div class="switch" data-switch="' + path + '"><button type="button" data-v="1">On</button><button type="button" class="off" data-v="0">Off</button></div>';
  }
  function bindSwitches(root, onChange) {
    root.querySelectorAll("[data-switch]").forEach(function (sw) {
      var path = sw.getAttribute("data-switch").split("."), obj = S.cfg[path[0]], key = path[1];
      function paint() { sw.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-v") === "1") === !!obj[key])); }); }
      paint();
      sw.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        obj[key] = b.getAttribute("data-v") === "1"; paint();
        cfgCheck(); refreshBar(); if (onChange) onChange();
      });
    });
  }

  /* ---------- Videos tab ---------- */
  function paneVideos(pane) {
    var nv = S.cfg.nextVideo, slip = +nv.pushedBack || 0;
    pane.innerHTML =
      "<h2>Next video drop</h2>" +
      '<div class="row"><label class="field"><span>Date and time (UK time)</span><input type="datetime-local" data-bind="nextVideo.date"></label>' +
      '<label class="field"><span>Label (optional)</span><input type="text" data-bind="nextVideo.label" placeholder="e.g. Planet Zoo vs ZT2"><span class="hint" style="text-transform:none;letter-spacing:0">Shows instead of the date under the countdown.</span></label></div>' +
      '<label class="check"><input type="checkbox" id="tba"' + (nv.date ? "" : " checked") + "> Date to be announced (no countdown)</label>" +
      '<label class="field" style="max-width:340px"><span>Delayed?</span><select id="slip">' +
      '<option value="0">No, on time</option><option value="7">Pushed back 1 week</option><option value="14">Pushed back 2 weeks</option><option value="custom">Pushed back… (days)</option></select></label>' +
      '<label class="field" id="slip-days" style="max-width:200px" hidden><span>Days</span><input type="number" min="1" max="60" data-bind="nextVideo.pushedBack" data-type="num"></label>' +
      '<p class="hint">When delayed, the old date shows crossed out under the countdown. Set it back to "on time" for the next video.</p>' +
      "<h2>Latest video (backup)</h2>" +
      '<p class="hint" style="margin:-4px 0 14px">Normally the YouTube robot fills this in by itself every few hours. This is only shown if the robot hasn\'t run.</p>' +
      '<div class="vid-preview"><img alt="" id="lv-thumb"><span class="hint" id="lv-id"></span></div>' +
      '<label class="field"><span>YouTube link or ID</span><input type="text" data-bind="latestVideo.id" data-type="yt" placeholder="https://youtu.be/…"></label>' +
      '<label class="field"><span>Title</span><input type="text" data-bind="latestVideo.title"></label>' +
      '<label class="field"><span>One-line blurb</span><input type="text" data-bind="latestVideo.blurb"></label>';
    var slipSel = pane.querySelector("#slip"), slipDays = pane.querySelector("#slip-days");
    slipSel.value = slip === 0 ? "0" : slip === 7 ? "7" : slip === 14 ? "14" : "custom";
    slipDays.hidden = slipSel.value !== "custom";
    function lv() { var id = S.cfg.latestVideo.id; var im = pane.querySelector("#lv-thumb"); im.src = thumb(id); im.hidden = !id; pane.querySelector("#lv-id").textContent = id ? "Video ID: " + id : ""; }
    bindInputs(pane, function (el) {
      if (el.getAttribute("data-bind") === "nextVideo.date") pane.querySelector("#tba").checked = !el.value;
      lv();
    });
    lv();
    pane.querySelector("#tba").addEventListener("change", function (e) {
      var d = pane.querySelector('[data-bind="nextVideo.date"]');
      if (e.target.checked) { d.dataset.keep = d.value; d.value = ""; } else if (d.dataset.keep) d.value = d.dataset.keep;
      d.dispatchEvent(new Event("input"));
    });
    slipSel.addEventListener("change", function () {
      slipDays.hidden = slipSel.value !== "custom";
      var inp = slipDays.querySelector("input");
      var v = slipSel.value === "custom" ? (+inp.value || 3) : +slipSel.value;
      inp.value = v; inp.dispatchEvent(new Event("input"));
    });
  }

  /* ---------- Banner & pop-up tab ---------- */
  function paneNotices(pane) {
    pane.innerHTML =
      "<h2>Scrolling banner</h2>" +
      '<p class="hint" style="margin:-4px 0 12px">Runs across the top of every page.</p>' +
      switchHTML("banner.on") +
      '<div class="bn-preview" id="bn-prev"></div>' +
      '<label class="field"><span>Messages (one per line)</span><textarea data-bind="banner.messages" data-type="lines" rows="3"></textarea></label>' +
      '<div class="row"><label class="field"><span>Link when clicked (optional)</span><input type="text" data-bind="banner.link" placeholder="e.g. readables/ or https://youtu.be/…"></label>' +
      '<label class="field"><span>Speed</span><input type="range" min="20" max="160" step="10" data-bind="banner.speed" data-type="num" style="accent-color:var(--green-dk)"><span class="hint" style="text-transform:none;letter-spacing:0">Left = slower, right = faster</span></label></div>' +
      "<h2>Pop-up notice</h2>" +
      '<p class="hint" style="margin:-4px 0 12px">Each visitor sees it once. Use "Show to everyone again" when you change it to something new.</p>' +
      switchHTML("popup.on") +
      '<div class="row"><label class="field"><span>Window title</span><input type="text" data-bind="popup.title" placeholder="NOTICE.TXT"></label>' +
      '<label class="field"><span>Button text</span><input type="text" data-bind="popup.button" placeholder="OK"></label></div>' +
      '<label class="field"><span>Message</span><textarea data-bind="popup.message" rows="3"></textarea><span class="hint" style="text-transform:none;letter-spacing:0">A blank line starts a new paragraph.</span></label>' +
      '<div class="row"><label class="field"><span>Extra button link (optional)</span><input type="text" data-bind="popup.link" placeholder="https://youtu.be/…"></label>' +
      '<label class="field"><span>Extra button text</span><input type="text" data-bind="popup.linkText" placeholder="Take a look"></label></div>' +
      '<div class="row"><label class="check"><input type="checkbox" data-bind="popup.homeOnly"> Home page only</label>' +
      '<label class="field"><span>Seconds before it appears</span><input type="number" min="0" max="30" step="0.5" data-bind="popup.delay" data-type="num"></label></div>' +
      '<div class="actions"><button class="btn" type="button" id="pp-preview">Preview pop-up</button>' +
      '<button class="btn" type="button" id="pp-again">Show to everyone again</button><span class="hint" id="pp-id"></span></div>';
    function preview() {
      var b = S.cfg.banner, box = pane.querySelector("#bn-prev"), msgs = (b.messages || []).filter(Boolean);
      box.innerHTML = msgs.length ? '<div class="marquee"><div class="marquee-track" style="animation-duration:' + Math.max(6, 900 / (+b.speed || 60)) + 's">' +
        [0, 1].map(function () { return '<span class="marquee-run">' + msgs.concat(msgs).map(function (m) { return '<span class="marquee-msg">' + esc(m) + '</span><img class="marquee-sep px" src="../assets/img/duck.svg" alt="">'; }).join("") + "</span>"; }).join("") +
        "</div></div>" : '<p class="hint" style="padding:8px 12px;margin:0">Add a message to see a preview.</p>';
      box.style.opacity = b.on ? 1 : 0.45;
      pane.querySelector("#pp-id").textContent = "Notice ID: " + (S.cfg.popup.id || "notice");
    }
    bindInputs(pane, preview); bindSwitches(pane, preview); preview();
    pane.querySelector("#pp-again").addEventListener("click", function () {
      var id = S.cfg.popup.id || "notice-0", m = id.match(/^(.*?)(\d+)$/);
      S.cfg.popup.id = m ? m[1] + (+m[2] + 1) : id + "-2";
      cfgCheck(); refreshBar(); preview();
    });
    pane.querySelector("#pp-preview").addEventListener("click", function () { popupPreview(S.cfg.popup); });
  }
  function popupPreview(pp) {
    var back = document.createElement("div");
    back.className = "popup-backdrop";
    back.innerHTML = '<div class="popup" role="dialog" aria-modal="true" aria-label="Preview"><div class="win-bar"><img class="px" src="../assets/img/duck.svg" alt=""><span class="win-title">' + esc(pp.title || "NOTICE.TXT") + '</span><span class="win-btns"><button type="button" data-x aria-label="Close">×</button></span></div>' +
      '<div class="popup-body"><img class="popup-icon px" src="../assets/img/bell.svg" alt=""><div class="popup-text">' + String(pp.message || "(no message yet)").split(/\n+/).map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + "</div></div>" +
      '<div class="popup-btns">' + (pp.link ? '<span class="btn">' + esc(pp.linkText || "Take a look") + "</span>" : "") + '<button type="button" class="btn btn--green" data-x>' + esc(pp.button || "OK") + "</button></div></div>";
    function close() { back.remove(); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") close(); }
    back.addEventListener("click", function (e) { if (e.target === back || e.target.closest("[data-x]")) close(); });
    document.addEventListener("keydown", key);
    document.body.appendChild(back);
    back.querySelector(".btn--green").focus();
  }

  /* ---------- Ticker tab ---------- */
  function paneTicker(pane) {
    pane.innerHTML = "<h2>Taskbar ticker</h2>" +
      '<p class="hint" style="margin:-4px 0 12px">The messages that scroll along the taskbar at the bottom of the home page desktop.</p>' +
      '<label class="field"><span>Messages (one per line)</span><textarea data-bind="ticker" data-type="lines" rows="10"></textarea></label>';
    bindInputs(pane);
  }

  /* ---------- Members tab ---------- */
  function paneMembers(pane) {
    pane.innerHTML = "<h2>Members wall</h2>" +
      '<p class="hint" style="margin:-4px 0 12px">The names on the Memberships page.</p>' +
      '<label class="field"><span>Names (one per line)</span><textarea id="mem" rows="10"></textarea></label>';
    var ta = pane.querySelector("#mem"), orig = parseMembers(S.files[P.members].text);
    ta.value = S.members.join("\n");
    ta.addEventListener("input", function () {
      S.members = lines(ta.value);
      if (same(S.members, orig)) delete S.dirty.members; else S.dirty.members = true;
      refreshBar();
    });
  }

  /* ---------- Readables tab ---------- */
  function paneReadables(pane) {
    if (S.view && S.view.kind === "post") return postEditor(pane);
    var orig = (evalGlobal(S.files[P.posts].text, "READABLES") || []).map(function (p) { return p.slug; });
    pane.innerHTML = '<div class="editor-head"><h2 style="margin:0;flex:1">Readables</h2><button class="btn btn--green" type="button" id="new-post">+ New readable</button></div>' +
      (S.posts.length ? '<div class="list">' + S.posts.map(function (p, i) {
        var meta = [p.status === "soon" ? '<span class="tag-soon">Coming soon</span>' : esc(p.date || "")];
        if (orig.indexOf(p.slug) < 0) meta.push('<span class="tag-new">New</span>');
        if (S.mdDirty[p.slug]) meta.push('<span class="tag-new">Edited</span>');
        if (p.tags && p.tags.length) meta.push(esc(p.tags.join(", ")));
        return '<div class="item">' + (p.videoId ? '<img alt="" loading="lazy" src="' + esc(thumb(p.videoId)) + '">' : '<div class="noimg">READABLE</div>') +
          '<div><div class="t">' + esc(p.title) + '</div><div class="m">' + meta.filter(Boolean).join(" · ") + "</div></div>" +
          '<div class="b"><button class="btn small" data-edit="' + i + '">Edit</button><button class="btn small" data-up="' + i + '"' + (i ? "" : " disabled") + ' aria-label="Move up">↑</button><button class="btn small" data-down="' + i + '"' + (i < S.posts.length - 1 ? "" : " disabled") + ' aria-label="Move down">↓</button><button class="btn small danger" data-del="' + i + '">Delete</button></div></div>';
      }).join("") + "</div>" : '<p class="hint">No readables yet.</p>') +
      '<p class="hint">The list is in the order it shows on the site, newest first.</p>';
    pane.querySelector("#new-post").addEventListener("click", function () {
      var author = (S.posts.filter(function (p) { return p.author; })[0] || {}).author || "";
      S.posts.unshift({ slug: "", title: "", videoId: "", author: author, date: today(), tags: [], summary: "", _new: true, _autoSlug: true });
      S.md[""] = "";
      S.view = { kind: "post", index: 0, isNew: true };
      renderPane();
    });
    pane.querySelector(".list") && pane.querySelector(".list").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var i;
      if ((i = b.getAttribute("data-edit")) != null) { S.view = { kind: "post", index: +i }; renderPane(); return; }
      if ((i = b.getAttribute("data-up")) != null) { i = +i; S.posts.splice(i - 1, 0, S.posts.splice(i, 1)[0]); }
      if ((i = b.getAttribute("data-down")) != null) { i = +i; S.posts.splice(i + 1, 0, S.posts.splice(i, 1)[0]); }
      if ((i = b.getAttribute("data-del")) != null) {
        var p = S.posts[+i];
        if (!confirm('Delete "' + p.title + '"?' + (p.status === "soon" ? "" : " Its article file will be removed too.") + " (Nothing happens until you publish.)")) return;
        S.posts.splice(+i, 1);
        if (p.slug) { S.removedSlugs.push({ slug: p.slug, soon: p.status === "soon" }); delete S.mdDirty[p.slug]; ensureMdKnown(p.slug); }
      }
      touch("posts"); renderPane();
    });
  }
  async function ensureMdKnown(slug) {
    if (S.mdExists[slug] !== undefined || !slug) return;
    try { var f = await getFile(P.md(slug)); S.mdExists[slug] = f ? f.sha : undefined; if (f && S.md[slug] === undefined) S.md[slug] = f.text; refreshBar(); } catch (e) {}
  }

  function postEditor(pane) {
    var idx = S.view.index, p = S.posts[idx];
    var origSlugs = (evalGlobal(S.files[P.posts].text, "READABLES") || []).map(function (x) { return x.slug; });
    var locked = !p._new && origSlugs.indexOf(p.slug) >= 0 && p.status !== "soon";
    var allTags = [];
    S.posts.forEach(function (x) { (x.tags || []).forEach(function (t) { if (allTags.indexOf(t) < 0) allTags.push(t); }); });
    pane.innerHTML =
      '<div class="editor-head"><button class="btn small" type="button" id="back">‹ All readables</button><span class="hint">' + (p._new ? "New readable" : "Editing") + "</span></div>" +
      '<div id="perr"></div>' +
      '<label class="field"><span>Title</span><input type="text" id="p-title"></label>' +
      '<div class="row"><label class="field"><span>Web address name</span><input type="text" id="p-slug" spellcheck="false"' + (locked ? " readonly" : "") + '><span class="hint" style="text-transform:none;letter-spacing:0">' + (locked ? "Locked so old links keep working." : "Made from the title. Lowercase and dashes.") + "</span></label>" +
      '<label class="field"><span>Status</span><select id="p-status"><option value="">Published</option><option value="soon">Coming soon (no article yet)</option></select></label></div>' +
      '<div class="vid-preview"><img alt="" id="p-thumb"></div>' +
      '<div class="row"><label class="field"><span>YouTube link or ID (optional)</span><input type="text" id="p-video" placeholder="https://youtu.be/…"></label>' +
      '<label class="field"><span>Date</span><input type="date" id="p-date"></label></div>' +
      '<div class="row"><label class="field"><span>Written by</span><input type="text" id="p-author"></label>' +
      '<label class="field"><span>Edited by (optional)</span><input type="text" id="p-editor"></label></div>' +
      '<div class="row"><label class="field"><span>Tags (comma between)</span><input type="text" id="p-tags" list="taglist" placeholder="Review"><datalist id="taglist">' + allTags.map(function (t) { return '<option value="' + esc(t) + '">'; }).join("") + '</datalist><span class="hint" style="text-transform:none;letter-spacing:0">Used so far: ' + esc(allTags.join(", ") || "none") + "</span></label>" +
      '<label class="field"><span>Reading time (optional)</span><input type="number" id="p-minutes" min="1" max="120" placeholder="worked out for you"></label></div>' +
      '<label class="field"><span>Summary (one or two sentences for the card)</span><textarea id="p-summary" rows="2"></textarea></label>' +
      '<div id="body-wrap"><div class="editor-head" style="margin:14px 0 6px"><span style="font-size:15px;letter-spacing:.1em;text-transform:uppercase">Article</span>' +
      '<div class="switch" style="margin:0"><button type="button" id="w-write" aria-pressed="true">Write</button><button type="button" id="w-prev" aria-pressed="false">Preview</button></div></div>' +
      '<p class="cheat"><code>## Heading</code> &nbsp; blank line = new paragraph &nbsp; <code>*italic*</code> &nbsp; <code>**bold**</code> &nbsp; <code>[link text](https://…)</code> &nbsp; <code>&gt; quote</code> &nbsp; <code>- list item</code> &nbsp; <code>{{youtube VIDEO_ID}}</code> on its own line embeds a video</p>' +
      '<textarea class="mono" id="p-body" placeholder="Loading…"></textarea><div class="preview-box" id="p-preview" hidden><div class="prose"></div></div></div>' +
      '<div class="actions" style="margin-top:18px"><button class="btn btn--green" type="button" id="done">Done</button>' + (p._new ? '<button class="btn danger" type="button" id="cancel">Cancel</button>' : "") + "</div>";

    var $ = function (id) { return pane.querySelector("#" + id); };
    $("p-title").value = p.title || ""; $("p-slug").value = p.slug || ""; $("p-status").value = p.status || "";
    $("p-video").value = p.videoId || ""; $("p-date").value = p.date || ""; $("p-author").value = p.author || "";
    $("p-editor").value = p.editor || ""; $("p-tags").value = (p.tags || []).join(", "); $("p-minutes").value = p.minutes || "";
    $("p-summary").value = p.summary || "";
    var bodyKey = p.slug;
    function thumbUpd() { var id = ytId($("p-video").value); $("p-thumb").src = thumb(id); $("p-thumb").hidden = !id; }
    thumbUpd();

    // load the article text
    var body = $("p-body");
    if (S.md[bodyKey] !== undefined) { body.value = S.md[bodyKey]; body.placeholder = "Write the article here…"; }
    else if (!p.slug) { S.md[""] = ""; body.placeholder = "Write the article here…"; }
    else {
      body.disabled = true;
      getFile(P.md(p.slug)).then(function (f) {
        S.mdExists[p.slug] = f ? f.sha : undefined;
        if (S.md[bodyKey] === undefined) S.md[bodyKey] = f ? f.text : "";
        body.value = S.md[bodyKey]; body.disabled = false; body.placeholder = "Write the article here…";
      }).catch(function (e) { body.placeholder = "Couldn't load the article: " + e.message; });
    }

    function save() {
      var oldSlug = p.slug;
      p.title = $("p-title").value.trim();
      if (!locked) {
        if (p._autoSlug && document.activeElement !== $("p-slug")) $("p-slug").value = slugify(p.title);
        p.slug = slugify($("p-slug").value) || "";
      }
      p.status = $("p-status").value || undefined;
      p.videoId = ytId($("p-video").value) || undefined;
      p.date = $("p-date").value || undefined;
      p.author = $("p-author").value.trim() || undefined;
      p.editor = $("p-editor").value.trim() || undefined;
      p.tags = $("p-tags").value.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
      p.minutes = $("p-minutes").value ? +$("p-minutes").value : undefined;
      p.summary = $("p-summary").value.trim() || undefined;
      // keep the article text under the (possibly new) web address name
      if (oldSlug !== p.slug) {
        if (S.md[oldSlug] !== undefined) { S.md[p.slug] = S.md[oldSlug]; delete S.md[oldSlug]; }
        if (S.mdDirty[oldSlug]) { S.mdDirty[p.slug] = true; delete S.mdDirty[oldSlug]; }
        bodyKey = p.slug;
      }
      touch("posts");
    }
    ["p-title", "p-slug", "p-status", "p-video", "p-date", "p-author", "p-editor", "p-tags", "p-minutes", "p-summary"].forEach(function (id) {
      $(id).addEventListener(id === "p-status" ? "change" : "input", function () {
        if (id === "p-slug") p._autoSlug = false;
        save();
        if (id === "p-video") { thumbUpd(); autoTitle(); }
      });
    });
    body.addEventListener("input", function () { S.md[bodyKey] = body.value; if (bodyKey) S.mdDirty[bodyKey] = true; refreshBar(); });
    function autoTitle() {
      var id = ytId($("p-video").value); if (!id || $("p-title").value.trim()) return;
      fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://youtu.be/" + id))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.title && !$("p-title").value.trim()) { $("p-title").value = j.title; save(); } }).catch(function () {});
    }
    $("w-write").addEventListener("click", function () { $("w-write").setAttribute("aria-pressed", "true"); $("w-prev").setAttribute("aria-pressed", "false"); body.hidden = false; $("p-preview").hidden = true; });
    $("w-prev").addEventListener("click", function () {
      $("w-prev").setAttribute("aria-pressed", "true"); $("w-write").setAttribute("aria-pressed", "false");
      body.hidden = true; $("p-preview").hidden = false;
      $("p-preview").firstChild.innerHTML = window.DucklopsMarkdown ? window.DucklopsMarkdown(body.value || "") : esc(body.value);
    });
    $("back").addEventListener("click", done);
    $("done").addEventListener("click", done);
    if ($("cancel")) $("cancel").addEventListener("click", function () {
      S.posts.splice(idx, 1); delete S.mdDirty[p.slug]; delete S.md[p.slug];
      if (same(S.posts, evalGlobal(S.files[P.posts].text, "READABLES"))) delete S.dirty.posts;
      S.view = null; refreshBar(); renderPane();
    });
    function done() {
      save();
      var err = "";
      if (!p.title) err = "Give it a title.";
      else if (!p.slug) err = "It needs a web address name.";
      else if (S.posts.some(function (x, i) { return i !== idx && x.slug === p.slug; })) err = 'Another readable already uses "' + p.slug + '". Change the web address name.';
      else if (p.status !== "soon" && !(S.md[p.slug] || "").trim() && S.mdExists[p.slug] === undefined && p._new) err = "Write the article, or set the status to Coming soon.";
      if (err) { $("perr").innerHTML = '<div class="msg err">' + esc(err) + "</div>"; window.scrollTo(0, 0); return; }
      if (p._new && (S.md[p.slug] || "").trim()) S.mdDirty[p.slug] = true;
      delete p._new; delete p._autoSlug;
      // a "soon" post that becomes published, or any slug we haven't checked yet: find out whether its file exists
      ensureMdKnown(p.slug);
      if (same(S.posts, evalGlobal(S.files[P.posts].text, "READABLES"))) delete S.dirty.posts;
      S.view = null; refreshBar(); renderPane();
    }
  }

  /* ---------- Corrections tab ---------- */
  function paneCorrections(pane) {
    if (S.view && S.view.kind === "corr") return corrEditor(pane);
    pane.innerHTML = '<div class="editor-head"><h2 style="margin:0;flex:1">Corrections</h2><button class="btn btn--green" type="button" id="new-corr">+ Add a video</button></div>' +
      '<p class="hint" style="margin:-6px 0 14px">To add a correction to a video that\'s already listed, click Edit on it.</p>' +
      (S.corr.length ? '<div class="list">' + S.corr.map(function (c, i) {
        return '<div class="item">' + (c.videoId ? '<img alt="" loading="lazy" src="' + esc(thumb(c.videoId)) + '">' : '<div class="noimg">VIDEO</div>') +
          '<div><div class="t">' + esc(c.title) + '</div><div class="m">' + c.fixes.length + " correction" + (c.fixes.length === 1 ? "" : "s") + "</div></div>" +
          '<div class="b"><button class="btn small" data-edit="' + i + '">Edit</button><button class="btn small" data-up="' + i + '"' + (i ? "" : " disabled") + ' aria-label="Move up">↑</button><button class="btn small" data-down="' + i + '"' + (i < S.corr.length - 1 ? "" : " disabled") + ' aria-label="Move down">↓</button><button class="btn small danger" data-del="' + i + '">Delete</button></div></div>';
      }).join("") + "</div>" : '<p class="hint">No corrections yet.</p>') +
      '<p class="hint">Newest video at the top.</p>';
    pane.querySelector("#new-corr").addEventListener("click", function () {
      var max = S.corr.reduce(function (m, c) { var n = +(String(c.id).match(/\d+/) || [0])[0]; return Math.max(m, n); }, 0);
      S.corr.unshift({ id: "c" + (max + 1), videoId: "", title: "", fixes: [{ time: "", seconds: null, text: "", thanks: "" }], _new: true });
      S.view = { kind: "corr", index: 0, isNew: true }; renderPane();
    });
    var list = pane.querySelector(".list");
    if (list) list.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var i;
      if ((i = b.getAttribute("data-edit")) != null) { S.view = { kind: "corr", index: +i }; renderPane(); return; }
      if ((i = b.getAttribute("data-up")) != null) { i = +i; S.corr.splice(i - 1, 0, S.corr.splice(i, 1)[0]); }
      if ((i = b.getAttribute("data-down")) != null) { i = +i; S.corr.splice(i + 1, 0, S.corr.splice(i, 1)[0]); }
      if ((i = b.getAttribute("data-del")) != null) { if (!confirm('Remove all corrections for "' + S.corr[+i].title + '"?')) return; S.corr.splice(+i, 1); }
      corrTouched(); renderPane();
    });
  }
  function corrTouched() {
    var clean = S.corr.map(function (c) { return { id: c.id, videoId: c.videoId, title: c.title, fixes: c.fixes.map(function (f) { return { time: f.time, seconds: f.seconds, thanks: f.thanks, text: f.text }; }) }; });
    if (same(clean, parseCorrections(S.files[P.corrections].text))) delete S.dirty.corrections; else S.dirty.corrections = true;
    refreshBar();
  }
  function corrEditor(pane) {
    var idx = S.view.index, c = S.corr[idx];
    function fixHTML(f, i) {
      return '<div class="fix" data-fix="' + i + '"><div class="fix-head"><span>Correction ' + (i + 1) + "</span>" +
        '<span class="actions" style="margin:0"><button class="btn small" type="button" data-fup="' + i + '"' + (i ? "" : " disabled") + ' aria-label="Move up">↑</button><button class="btn small" type="button" data-fdown="' + i + '"' + (i < c.fixes.length - 1 ? "" : " disabled") + ' aria-label="Move down">↓</button><button class="btn small danger" type="button" data-fdel="' + i + '">Remove</button></span></div>' +
        '<div class="row"><label class="field"><span>Timestamp (optional)</span><input type="text" data-f="time" placeholder="e.g. 4:20"></label>' +
        '<label class="field"><span>Thanks (optional)</span><input type="text" data-f="thanks" placeholder="Thank you @name"></label></div>' +
        '<label class="field"><span>What was wrong, and the right answer</span><textarea data-f="text" rows="3"></textarea></label></div>';
    }
    pane.innerHTML =
      '<div class="editor-head"><button class="btn small" type="button" id="back">‹ All corrections</button><span class="hint">' + (c._new ? "New video" : "Editing") + "</span></div>" +
      '<div id="cerr"></div>' +
      '<div class="vid-preview"><img alt="" id="c-thumb"></div>' +
      '<label class="field"><span>YouTube link or ID</span><input type="text" id="c-video" placeholder="https://youtu.be/…"></label>' +
      '<label class="field"><span>Video title</span><input type="text" id="c-title"></label>' +
      '<h2>Corrections</h2><div id="fixes">' + c.fixes.map(fixHTML).join("") + "</div>" +
      '<div class="actions"><button class="btn" type="button" id="add-fix">+ Add a correction</button></div>' +
      '<div class="actions" style="margin-top:22px"><button class="btn btn--green" type="button" id="done">Done</button>' + (c._new ? '<button class="btn danger" type="button" id="cancel">Cancel</button>' : "") + "</div>";
    var $ = function (id) { return pane.querySelector("#" + id); };
    $("c-video").value = c.videoId; $("c-title").value = c.title;
    function thumbUpd() { var id = ytId($("c-video").value); $("c-thumb").src = thumb(id); $("c-thumb").hidden = !id; }
    thumbUpd();
    function fillFixes() {
      pane.querySelectorAll("[data-fix]").forEach(function (box) {
        var f = c.fixes[+box.getAttribute("data-fix")];
        box.querySelectorAll("[data-f]").forEach(function (inp) { inp.value = f[inp.getAttribute("data-f")] || ""; });
      });
    }
    fillFixes();
    $("c-video").addEventListener("input", function () {
      c.videoId = ytId($("c-video").value); thumbUpd(); corrTouched();
      if (c.videoId && !$("c-title").value.trim()) {
        fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://youtu.be/" + c.videoId))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { if (j && j.title && !$("c-title").value.trim()) { $("c-title").value = c.title = j.title; corrTouched(); } }).catch(function () {});
      }
    });
    $("c-title").addEventListener("input", function () { c.title = $("c-title").value; corrTouched(); });
    $("fixes").addEventListener("input", function (e) {
      var inp = e.target.closest("[data-f]"); if (!inp) return;
      var f = c.fixes[+inp.closest("[data-fix]").getAttribute("data-fix")], k = inp.getAttribute("data-f");
      f[k] = k === "text" ? inp.value : inp.value.trim();
      if (k === "time") f.seconds = toSeconds(f.time);
      corrTouched();
    });
    $("fixes").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var i;
      if ((i = b.getAttribute("data-fup")) != null) { i = +i; c.fixes.splice(i - 1, 0, c.fixes.splice(i, 1)[0]); }
      if ((i = b.getAttribute("data-fdown")) != null) { i = +i; c.fixes.splice(i + 1, 0, c.fixes.splice(i, 1)[0]); }
      if ((i = b.getAttribute("data-fdel")) != null) c.fixes.splice(+i, 1);
      $("fixes").innerHTML = c.fixes.map(fixHTML).join(""); fillFixes(); corrTouched();
    });
    $("add-fix").addEventListener("click", function () {
      c.fixes.push({ time: "", seconds: null, text: "", thanks: "" });
      $("fixes").innerHTML = c.fixes.map(fixHTML).join(""); fillFixes();
      var last = pane.querySelector('[data-fix="' + (c.fixes.length - 1) + '"] textarea'); if (last) last.focus();
    });
    function done() {
      c.fixes = c.fixes.filter(function (f) { return f.text.trim(); });
      var err = "";
      if (!c.videoId) err = "Paste the YouTube link for the video.";
      else if (!c.title.trim()) err = "Give the video's title.";
      else if (!c.fixes.length) err = "Add at least one correction (or Delete this video from the list).";
      else c.fixes.forEach(function (f, i) { if (f.time && f.seconds == null && !err) err = 'Correction ' + (i + 1) + ': the timestamp "' + f.time + '" should look like 4:20 or 1:02:03.'; });
      if (err) { $("cerr").innerHTML = '<div class="msg err">' + esc(err) + "</div>"; $("fixes").innerHTML = c.fixes.map(fixHTML).join(""); fillFixes(); window.scrollTo(0, 0); return; }
      c.title = c.title.trim(); delete c._new;
      corrTouched(); S.view = null; renderPane();
    }
    $("back").addEventListener("click", done);
    $("done").addEventListener("click", done);
    if ($("cancel")) $("cancel").addEventListener("click", function () { S.corr.splice(idx, 1); corrTouched(); S.view = null; renderPane(); });
  }

  /* ---------------- publish ---------------- */
  function openPublish() {
    if (S.view) { var d = app.querySelector("#done"); if (d) { d.click(); if (S.view) return; } }
    var list;
    try { list = changes().map(function (c) { if (!c.remove) c.content = c.gen(); return c; }); }
    catch (e) { fail(e); return; }
    list = list.filter(function (c) { return c.remove || c.content !== (S.files[c.path] ? S.files[c.path].text : null); });
    if (!list.length) { alert("Nothing has actually changed."); return; }
    var bits = [];
    if (list.some(function (c) { return c.path === P.config; })) bits.push("settings");
    if (list.some(function (c) { return c.path === P.posts || /readables\/posts\//.test(c.path); })) bits.push("readables");
    if (list.some(function (c) { return c.path === P.corrections; })) bits.push("corrections");
    if (list.some(function (c) { return c.path === P.members; })) bits.push("members");
    var back = document.createElement("div");
    back.className = "popup-backdrop";
    back.innerHTML = '<div class="popup" role="dialog" aria-modal="true" aria-labelledby="pub-t" style="width:min(520px,100%)"><div class="win-bar"><img class="px" src="../assets/img/notepad.svg" alt=""><span class="win-title" id="pub-t">PUBLISH.EXE</span><span class="win-btns"><button type="button" data-x aria-label="Close">×</button></span></div>' +
      '<div style="padding:18px 22px 4px"><p style="margin:0 0 6px">These go live together:</p><ul class="filelist">' +
      list.map(function (c) { return "<li>" + esc(c.label) + "</li>"; }).join("") + "</ul>" +
      '<label class="field"><span>Note (shows in GitHub history)</span><input type="text" id="pub-msg"></label><div id="pub-out"></div></div>' +
      '<div class="popup-btns"><button type="button" class="btn" data-x>Not yet</button><button type="button" class="btn btn--green" id="pub-go">Publish now</button></div></div>';
    document.body.appendChild(back);
    var msg = back.querySelector("#pub-msg");
    msg.value = "Update " + bits.join(", ").replace(/, ([^,]*)$/, " and $1") + " (Ducklops console)";
    function close() { back.remove(); }
    back.addEventListener("click", function (e) { if (e.target === back || e.target.closest("[data-x]")) close(); });
    back.querySelector("#pub-go").addEventListener("click", async function () {
      var go = this, out = back.querySelector("#pub-out");
      go.disabled = true; go.textContent = "Publishing…";
      try {
        var sha = await publish(list, msg.value.trim() || "Update site (Ducklops console)");
        out.innerHTML = '<div class="msg ok">Published! The site updates in about a minute. <a href="../" target="_blank" rel="noopener">Open the site ›</a></div>';
        go.remove(); back.querySelector(".popup-btns [data-x]").textContent = "Close";
        await loadAll(sha);
      } catch (e) {
        out.innerHTML = '<div class="msg err">' + esc(e.message) + "</div>";
        go.disabled = false; go.textContent = "Try again";
      }
    });
  }

  async function publish(list, message) {
    setStatus("Publishing…");
    var ref = await gh("/repos/" + S.repo + "/git/ref/heads/" + encodeURIComponent(S.branch));
    var head = ref.object.sha;
    // make sure nobody changed these files on GitHub since we loaded them
    for (var i = 0; i < list.length; i++) {
      var c = list[i], known = S.files[c.path] ? S.files[c.path].sha : S.mdExists[c.path.replace(/^readables\/posts\/|\.md$/g, "")];
      var now = await getFile(c.path, head);
      if (c.remove && !now) { c.skip = true; continue; }
      if (known !== undefined && now && now.sha !== known) throw new Error(c.path + " was changed on GitHub after you opened the console. Copy anything you need, click Discard changes to reload, then redo it.");
    }
    var commit = await gh("/repos/" + S.repo + "/git/commits/" + head);
    var tree = list.filter(function (c) { return !c.skip; }).map(function (c) {
      return c.remove ? { path: c.path, mode: "100644", type: "blob", sha: null } : { path: c.path, mode: "100644", type: "blob", content: c.content };
    });
    var newTree = await gh("/repos/" + S.repo + "/git/trees", { method: "POST", body: { base_tree: commit.tree.sha, tree: tree } });
    var newCommit = await gh("/repos/" + S.repo + "/git/commits", { method: "POST", body: { message: message, tree: newTree.sha, parents: [head] } });
    await gh("/repos/" + S.repo + "/git/refs/heads/" + encodeURIComponent(S.branch), { method: "PATCH", body: { sha: newCommit.sha } });
    setStatus("Published · " + S.repo);
    return newCommit.sha;
  }

  window.addEventListener("beforeunload", function (e) { if (S.token && S.cfg && changeCount()) { e.preventDefault(); e.returnValue = ""; } });

  // for testing
  window.__ducklopsConsole = { S: S, genConfig: genConfig, genPosts: genPosts, genCorrections: genCorrections, genMembers: genMembers, parseCorrections: parseCorrections, changes: changes };

  /* ---------------- start ---------------- */
  var savedToken = sget(LS_TOKEN), savedRepo = sget(LS_REPO);
  if (savedToken && savedRepo) connect(savedRepo, savedToken, !!(store() && store().getItem(LS_TOKEN)));
  else renderLogin();
})();
