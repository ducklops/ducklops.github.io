/* DUCKLOPS — Readables (blog list + single post) */
(function () {
  "use strict";
  var POSTS = (window.READABLES || []).filter(function (p) { return p && p.slug && p.title; });
  var BASE = document.body.getAttribute("data-base") || "";   // path back to site root

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function thumb(id, alt) {
    return '<img class="yt" loading="lazy" alt="' + esc(alt || "") + '" src="https://i.ytimg.com/vi/' + esc(id) +
      '/maxresdefault.jpg" onerror="this.onerror=null;this.src=this.src.replace(\'maxresdefault\',\'hqdefault\')">';
  }
  function niceDate(d) {
    if (!d) return "";
    var t = new Date(d + (d.length === 10 ? "T12:00:00" : ""));
    return isNaN(t) ? esc(d) : t.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function postURL(p) { return BASE + "readables/post.html?p=" + encodeURIComponent(p.slug); }

  /* ----------------- scheduled Readables -----------------
     releaseAt: "2026-10-25T18:00" (UK time). Until then the card and the
     article page show a countdown instead of the article; the moment it
     hits zero the article appears by itself, no refresh needed. */
  function releaseOf(p) {
    if (!p || !p.releaseAt) return null;
    var E = window.DucklopsEvent;
    var t = E && E.ukTime ? E.ukTime(p.releaseAt) : Date.parse(p.releaseAt);
    return t == null || isNaN(t) ? null : t;
  }
  function locked(p, now) { var t = releaseOf(p); return t != null && t > (now == null ? Date.now() : now); }
  function isLive(p) { return p.status !== "soon" && !locked(p); }
  function unlockWhen(t) {
    var o = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" };
    try { return new Date(t).toLocaleString("en-GB", o); } catch (e) { return new Date(t).toLocaleString(); }
  }
  function two(n) { return n < 10 ? "0" + n : String(n); }
  function cdParts(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    return [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
  }
  var CD_UNITS = ["days", "hrs", "min", "sec"];
  function countdown(t) {
    var v = cdParts(t - Date.now());
    return '<span class="cd" data-unlock="' + t + '" aria-hidden="true">' + v.map(function (n, i) {
      return '<span class="cd-u"><b>' + two(n) + "</b><i>" + CD_UNITS[i] + "</i></span>";
    }).join("") + "</span>";
  }
  var LOCK_SVG = '<svg class="sched-lock" viewBox="0 0 10 12" aria-hidden="true" shape-rendering="crispEdges"><path d="M3 0h4v1h1v1h1v3H8V2H7V1H3v1H2v3H1V2h1V1h1z"/><path d="M0 5h10v7H0z"/><path class="k" d="M4 7h2v3H4z"/></svg>';
  function lockedArt(p, t) {
    return '<span class="sched-veil" aria-label="Locked until ' + esc(unlockWhen(t)) + '">' +
      '<span class="sched-flag">' + LOCK_SVG + "Locked</span>" +
      '<span class="sched-label">Goes public in</span>' + countdown(t) + "</span>";
  }

  // one shared clock for every countdown on the page
  var timer = null;
  function tick() {
    var els = document.querySelectorAll("[data-unlock]"), now = Date.now(), opened = false;
    if (!els.length) { clearInterval(timer); timer = null; return; }
    Array.prototype.forEach.call(els, function (el) {
      var left = +el.getAttribute("data-unlock") - now;
      if (left <= 0) { el.removeAttribute("data-unlock"); opened = true; }
      var v = cdParts(left), bs = el.querySelectorAll("b");
      for (var i = 0; i < bs.length; i++) if (bs[i].textContent !== two(v[i])) bs[i].textContent = two(v[i]);
    });
    if (opened) { try { document.dispatchEvent(new CustomEvent("ducklops:unlocked")); } catch (e) {} }
  }
  function startClock() { if (!document.querySelector("[data-unlock]")) return; if (!timer) timer = setInterval(tick, 1000); tick(); }
  // a tab left in the background can miss the moment: check again when it comes back
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });

  /* ----------------- per-article search + sharing tags -----------------
     Every article lives at post.html?p=slug, so the page's tags are filled in
     here for the article being shown (Google reads them after running JS). */
  var SITE = "https://www.ducklops.com/";
  function setSEO(p) {
    var url = SITE + "readables/post.html?p=" + encodeURIComponent(p.slug);
    var desc = p.summary || ("A Ducklops Readable: " + p.title + ", the written version of the video.");
    if (desc.length > 300) desc = desc.slice(0, 297).replace(/\s+\S*$/, "") + "…";
    var img = p.videoId ? "https://i.ytimg.com/vi/" + p.videoId + "/hqdefault.jpg" : SITE + "assets/img/logo.png";
    function tag(sel, make, attr, val) {
      var el = document.head.querySelector(sel);
      if (!el) { el = document.createElement(make[0]); el.setAttribute(make[1], make[2]); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    }
    tag('link[rel="canonical"]', ["link", "rel", "canonical"], "href", url);
    tag('meta[name="description"]', ["meta", "name", "description"], "content", desc);
    tag('meta[property="og:title"]', ["meta", "property", "og:title"], "content", p.title + " | Ducklops Readables");
    tag('meta[property="og:description"]', ["meta", "property", "og:description"], "content", desc);
    tag('meta[property="og:url"]', ["meta", "property", "og:url"], "content", url);
    tag('meta[property="og:type"]', ["meta", "property", "og:type"], "content", "article");
    tag('meta[property="og:image"]', ["meta", "property", "og:image"], "content", img);
    tag('meta[property="og:image:alt"]', ["meta", "property", "og:image:alt"], "content", p.title);
    tag('meta[name="twitter:card"]', ["meta", "name", "twitter:card"], "content", p.videoId ? "summary_large_image" : "summary");
    var ld = {
      "@context": "https://schema.org", "@type": "Article",
      headline: p.title, description: desc, image: [img], url: url, mainEntityOfPage: url, inLanguage: "en-GB",
      author: { "@type": "Person", name: p.author || "Ducklops" },
      publisher: { "@type": "Organization", name: "Ducklops", logo: { "@type": "ImageObject", url: SITE + "assets/img/logo.png" } }
    };
    if (p.date) { ld.datePublished = p.date; ld.dateModified = p.updated || p.date; }
    if (p.editor) ld.editor = { "@type": "Person", name: p.editor };
    if (p.videoId) ld.video = { "@type": "VideoObject", name: p.title, embedUrl: "https://www.youtube.com/embed/" + p.videoId, thumbnailUrl: img, uploadDate: p.date || undefined, description: desc };
    var s = document.createElement("script");
    s.type = "application/ld+json"; s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ----------------- tiny Markdown renderer ----------------- */
  function inline(s) {
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, a, u) { return '<img alt="' + a + '" src="' + u + '" loading="lazy">'; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) {
      var ext = /^https?:/i.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>");
    s = s.replace(/(^|\W)_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }
  function markdown(src) {
    var blocks = src.replace(/\r\n?/g, "\n").split(/\n\s*\n/), out = [];
    blocks.forEach(function (raw) {
      var b = raw.replace(/^\s+|\s+$/g, ""); if (!b) return;
      var m;
      if ((m = b.match(/^(#{1,4})\s+(.*)$/)) && b.indexOf("\n") === -1) {
        var lvl = Math.min(4, Math.max(2, m[1].length + (m[1].length === 1 ? 1 : 0)));
        var txt = inline(m[2]).replace(/^\[(\d+)\]\s*/, '<span class="num">[$1]</span> ');
        out.push("<h" + lvl + ">" + txt + "</h" + lvl + ">"); return;
      }
      if (/^(-{3,}|\*{3,})$/.test(b)) { out.push("<hr>"); return; }
      if ((m = b.match(/^\{\{\s*youtube\s+([\w-]{6,})\s*\}\}$/i))) {
        out.push('<div class="post-video"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/' + m[1] + '" title="YouTube video" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>'); return;
      }
      var lines = b.split("\n");
      if (lines.every(function (l) { return /^>\s?/.test(l); })) {
        out.push("<blockquote>" + markdown(lines.map(function (l) { return l.replace(/^>\s?/, ""); }).join("\n")) + "</blockquote>"); return;
      }
      if (lines.every(function (l) { return /^\s*[-*+]\s+/.test(l); })) {
        out.push("<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*[-*+]\s+/, "")) + "</li>"; }).join("") + "</ul>"); return;
      }
      if (lines.every(function (l) { return /^\s*\d+[.)]\s+/.test(l); })) {
        out.push("<ol>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*\d+[.)]\s+/, "")) + "</li>"; }).join("") + "</ol>"); return;
      }
      out.push("<p>" + lines.map(inline).join("<br>") + "</p>");
    });
    return out.join("\n");
  }
  window.DucklopsMarkdown = markdown;

  /* ----------------- card markup (used on Readables + Home) ----------------- */
  function card(p) {
    var tags = (p.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join(" ");
    if (p.status === "soon") {
      return '<article class="card soon" data-tags="' + esc((p.tags || []).join(",")) + '">' +
        '<div class="soon-art"><span>COMING SOON</span></div>' +
        '<div class="card-body"><div>' + tags + '</div><h3>' + esc(p.title) + '</h3><p>Being written up. Check back soon.</p></div></article>';
    }
    var meta = [];
    var rel = releaseOf(p);
    if (locked(p)) {
      meta.push("Opens " + esc(unlockWhen(rel)));
      if (p.author) meta.push("By " + esc(p.author));
      return '<a class="card sched" href="' + postURL(p) + '" data-tags="' + esc((p.tags || []).join(",")) + '">' +
        '<span class="thumb sched-thumb">' + (p.videoId ? thumb(p.videoId, "") : "") + lockedArt(p, rel) + "</span>" +
        '<div class="card-body"><div>' + tags + (tags ? " " : "") + '<span class="tag tag--sched">Scheduled</span></div><h3>' + esc(p.title) + "</h3>" +
        (p.summary ? "<p>" + esc(p.summary) + "</p>" : "") +
        '<div class="meta">' + meta.map(function (m) { return "<span>" + m + "</span>"; }).join("") + "</div></div></a>";
    }
    if (p.date) meta.push(niceDate(p.date));
    if (p.minutes) meta.push(p.minutes + " min read");
    if (p.author) meta.push("By " + esc(p.author));
    return '<a class="card" href="' + postURL(p) + '" data-tags="' + esc((p.tags || []).join(",")) + '">' +
      (p.videoId ? '<span class="thumb">' + thumb(p.videoId, "") + "</span>" : '<div class="soon-art">READABLE</div>') +
      '<div class="card-body"><div>' + tags + "</div><h3>" + esc(p.title) + "</h3>" +
      (p.summary ? "<p>" + esc(p.summary) + "</p>" : "") +
      '<div class="meta">' + meta.map(function (m) { return "<span>" + m + "</span>"; }).join("") + "</div></div></a>";
  }

  /* ----------------- home: latest 3 ----------------- */
  window.DucklopsReadables = { card: card, startClock: startClock, releaseOf: releaseOf, locked: locked };

  var homeList = document.querySelector("[data-readables-latest]");
  if (homeList) {
    var renderHome = function () {
      // scheduled ones count too: their countdown card is the teaser
      var live = POSTS.filter(function (p) { return p.status !== "soon"; }).slice(0, 3);
      homeList.innerHTML = live.length ? live.map(card).join("") : '<p class="empty">No Readables yet.</p>';
      startClock();
    };
    renderHome();
    document.addEventListener("ducklops:unlocked", renderHome);
  }

  /* ----------------- index page ----------------- */
  var grid = document.querySelector("[data-readables-grid]");
  if (grid) {
    var search = document.querySelector("[data-readables-search]");
    var chipBox = document.querySelector("[data-readables-chips]");
    var activeTag = "All";
    var tagSet = ["All"];
    POSTS.forEach(function (p) { (p.tags || []).forEach(function (t) { if (tagSet.indexOf(t) === -1) tagSet.push(t); }); });
    chipBox.innerHTML = tagSet.map(function (t) { return '<button type="button" class="chip" aria-pressed="' + (t === "All") + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>"; }).join("");
    function render() {
      var q = (search.value || "").trim().toLowerCase();
      var list = POSTS.filter(function (p) {
        var tagOK = activeTag === "All" || (p.tags || []).indexOf(activeTag) !== -1;
        var text = (p.title + " " + (p.summary || "") + " " + (p.tags || []).join(" ")).toLowerCase();
        return tagOK && (!q || text.indexOf(q) !== -1);
      });
      grid.innerHTML = list.length ? list.map(card).join("") : '<p class="empty">No readables match that. Try another word?</p>';
      var c = document.querySelector("[data-readables-count]");
      if (c) c.textContent = list.filter(isLive).length + " file(s)";
      startClock();
    }
    document.addEventListener("ducklops:unlocked", function () { render(); });
    chipBox.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      activeTag = b.getAttribute("data-tag");
      chipBox.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      render();
    });
    search.addEventListener("input", render);
    render();
  }

  /* ----------------- single post page ----------------- */
  var postBox = document.querySelector("[data-post]");
  if (postBox) {
    var slug = new URLSearchParams(location.search).get("p") || "";
    var idx = -1;
    POSTS.forEach(function (p, i) { if (p.slug === slug) idx = i; });
    var post = POSTS[idx];
    var titleBar = document.querySelector("[data-post-file]");
    var nav = document.querySelector("[data-post-nav]");
    function fail(msg) {
      postBox.innerHTML = '<div class="post-head"><p class="kicker">Error 404</p><h1 class="display post-title">Readable not found</h1></div>' +
        '<p class="prose">' + msg + '</p><p><a class="btn btn--green" href="' + BASE + 'readables/">Back to Readables</a></p>';
    }
    function robots(on) {
      var nr = document.head.querySelector('meta[name="robots"][data-hold]');
      if (on && !nr) { nr = document.createElement("meta"); nr.name = "robots"; nr.content = "noindex"; nr.setAttribute("data-hold", ""); document.head.appendChild(nr); }
      if (!on && nr) nr.remove();
    }
    function headHTML(p, meta) {
      return '<header class="post-head"><p class="kicker">Ducklops Readables' + ((p.tags || []).length ? " // " + esc(p.tags.join(" · ")) : "") + "</p>" +
        '<h1 class="display post-title">' + esc(p.title) + "</h1>" +
        '<div class="post-meta">' + meta.map(function (m) { return "<span>" + m + "</span>"; }).join("") + "</div></header>";
    }

    // scheduled and not out yet: a locked file with a countdown
    function showLocked(p) {
      var t = releaseOf(p);
      robots(true);                      // keep search engines off it until it's out
      document.title = p.title + " (coming " + new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ") | Ducklops Readables";
      if (titleBar) titleBar.textContent = p.slug.slice(0, 24).toUpperCase() + ".LOCKED";
      var meta = [];
      if (p.author) meta.push("Written by " + esc(p.author));
      if (p.editor) meta.push("Edited by " + esc(p.editor));
      meta.push("Opens " + esc(unlockWhen(t)));
      postBox.innerHTML = headHTML(p, meta) +
        '<div class="sched-hero"><div class="thumb sched-thumb">' + (p.videoId ? thumb(p.videoId, "") : "") + lockedArt(p, t) + "</div>" +
        '<div class="sched-note"><p>This Readable is written and waiting. It goes public on <b>' +
        esc(new Date(t).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })) +
        "</b>.</p><p>Leave this page open and it'll appear by itself when the clock hits zero.</p>" +
        '<div class="actions">' + (p.videoId ? '<a class="btn btn--green" href="https://youtu.be/' + esc(p.videoId) + '" target="_blank" rel="noopener">Watch the video now</a>' : "") +
        '<a class="btn" href="' + BASE + 'readables/">All Readables</a></div></div></div>';
      if (nav) nav.innerHTML = "";
      startClock();
      document.addEventListener("ducklops:unlocked", function once() {
        if (locked(p)) return;
        document.removeEventListener("ducklops:unlocked", once);
        robots(false);
        showPost(p);
        try { postBox.classList.add("just-opened"); } catch (e) {}
      });
    }

    function showPost(post) {
      document.title = post.title + " | Ducklops Readables";
      setSEO(post);
      if (titleBar) titleBar.textContent = post.slug.slice(0, 28).toUpperCase() + ".TXT";
      var meta = [];
      if (post.author) meta.push("Written by " + esc(post.author));
      if (post.editor) meta.push("Edited by " + esc(post.editor));
      if (post.date) meta.push(niceDate(post.date));
      if (post.minutes) meta.push(post.minutes + " min read");
      var video = post.videoId ? '<div class="post-video"><button type="button" class="thumb" data-load-video="' + esc(post.videoId) + '" aria-label="Play the video version">' +
        thumb(post.videoId, "Video thumbnail") + '<span class="play"><span></span></span></button>' +
        '<p class="kicker" style="margin:8px 0 0">Prefer watching? <a href="https://youtu.be/' + esc(post.videoId) + '" target="_blank" rel="noopener">Open on YouTube</a></p></div>' : "";
      postBox.innerHTML = headHTML(post, meta) + video + '<div class="prose" data-body><p class="kicker">Loading file…</p></div>';
      var vb = postBox.querySelector("[data-load-video]");
      if (vb) vb.addEventListener("click", function () {
        var f = document.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + vb.getAttribute("data-load-video") + "?autoplay=1";
        f.title = post.title; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true;
        vb.replaceWith(f);
      });
      var body = postBox.querySelector("[data-body]");
      fetch(BASE + "readables/posts/" + encodeURIComponent(post.slug) + ".md", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (md) {
          body.innerHTML = markdown(md);
          if (!post.minutes) {
            var words = md.split(/\s+/).length, mins = Math.max(1, Math.round(words / 220));
            var pm = postBox.querySelector(".post-meta"); if (pm) pm.insertAdjacentHTML("beforeend", "<span>" + mins + " min read</span>");
          }
        })
        .catch(function () {
          body.innerHTML = location.protocol === "file:" ?
            "<p>Posts load once the site is online (or running on a local server). Opening the HTML file directly can't read the article files.</p>" :
            "<p>Couldn't load this article. Check that <code>readables/posts/" + esc(post.slug) + ".md</code> exists.</p>";
        });
      // previous / next (only articles that are out)
      if (nav) {
        var live2 = POSTS.filter(isLive);
        var i2 = live2.indexOf(post), newer = live2[i2 - 1], older = live2[i2 + 1];
        nav.innerHTML = (older ? '<a class="btn" href="' + postURL(older) + '">← Older</a>' : "<span></span>") +
          '<a class="btn btn--green" href="' + BASE + 'readables/">All Readables</a>' +
          (newer ? '<a class="btn" href="' + postURL(newer) + '">Newer →</a>' : "<span></span>");
      }
    }

    if (!post || post.status === "soon") {
      robots(true);
      fail("That file seems to have waddled off. It may have been renamed or is still being written.");
    }
    else if (locked(post)) showLocked(post);
    else showPost(post);
    // reading progress in the title bar
    var bar = document.querySelector(".progress span");
    if (bar) {
      var upd = function () {
        var r = postBox.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
        var pct = total > 0 ? Math.min(100, Math.max(0, (-r.top + 120) / total * 100)) : 0;
        bar.style.width = pct + "%";
      };
      window.addEventListener("scroll", upd, { passive: true }); upd();
    }
  }
})();
