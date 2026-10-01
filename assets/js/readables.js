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
  var homeList = document.querySelector("[data-readables-latest]");
  if (homeList) {
    var live = POSTS.filter(function (p) { return p.status !== "soon"; }).slice(0, 3);
    homeList.innerHTML = live.length ? live.map(card).join("") : '<p class="empty">No Readables yet.</p>';
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
      if (c) c.textContent = list.filter(function (p) { return p.status !== "soon"; }).length + " file(s)";
    }
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
    function fail(msg) {
      postBox.innerHTML = '<div class="post-head"><p class="kicker">Error 404</p><h1 class="display post-title">Readable not found</h1></div>' +
        '<p class="prose">' + msg + '</p><p><a class="btn btn--green" href="' + BASE + 'readables/">Back to Readables</a></p>';
    }
    if (!post || post.status === "soon") { fail("That file seems to have waddled off. It may have been renamed or is still being written."); }
    else {
      document.title = post.title + " | Ducklops Readables";
      if (titleBar) titleBar.textContent = post.slug.slice(0, 28).toUpperCase() + ".TXT";
      var meta = [];
      if (post.author) meta.push("Written by " + esc(post.author));
      if (post.editor) meta.push("Edited by " + esc(post.editor));
      if (post.date) meta.push(niceDate(post.date));
      if (post.minutes) meta.push(post.minutes + " min read");
      var head = '<header class="post-head"><p class="kicker">Ducklops Readables' + ((post.tags || []).length ? " // " + esc(post.tags.join(" · ")) : "") + "</p>" +
        '<h1 class="display post-title">' + esc(post.title) + "</h1>" +
        '<div class="post-meta">' + meta.map(function (m) { return "<span>" + m + "</span>"; }).join("") + "</div></header>";
      var video = post.videoId ? '<div class="post-video"><button type="button" class="thumb" data-load-video="' + esc(post.videoId) + '" aria-label="Play the video version">' +
        thumb(post.videoId, "Video thumbnail") + '<span class="play"><span></span></span></button>' +
        '<p class="kicker" style="margin:8px 0 0">Prefer watching? <a href="https://youtu.be/' + esc(post.videoId) + '" target="_blank" rel="noopener">Open on YouTube</a></p></div>' : "";
      postBox.innerHTML = head + video + '<div class="prose" data-body><p class="kicker">Loading file…</p></div>';
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
      // previous / next
      var nav = document.querySelector("[data-post-nav]");
      if (nav) {
        var live2 = POSTS.filter(function (p) { return p.status !== "soon"; });
        var i2 = live2.indexOf(post), newer = live2[i2 - 1], older = live2[i2 + 1];
        nav.innerHTML = (older ? '<a class="btn" href="' + postURL(older) + '">← Older</a>' : "<span></span>") +
          '<a class="btn btn--green" href="' + BASE + 'readables/">All Readables</a>' +
          (newer ? '<a class="btn" href="' + postURL(newer) + '">Newer →</a>' : "<span></span>");
      }
    }
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
