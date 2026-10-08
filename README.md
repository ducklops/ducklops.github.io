# Ducklops website

A 90s "DucklopsOS" site for www.ducklops.com, built to run on **GitHub Pages**. Plain HTML, CSS and JavaScript: no build step, nothing to install.

```
index.html              Home (the DucklopsOS desktop)
readables/              Readables blog
  index.html            the list page
  post.html             shows one article (?p=slug)
  posts.js              <-- the list of articles (edit to add one)
  posts/*.md            <-- the articles themselves
  videos/…              redirects from your old Google Sites links
corrections/index.html  Corrections
memberships/index.html  Memberships
contact/index.html      Contact
ai/index.html           AI.TXT: your AI statement (hidden page, not in the main menu)
home/index.html         redirect: old /home link -> new homepage
404.html                "Duck not found" page
admin/                  the Console: edit everything below from a web page
assets/js/config.js     <-- day-to-day settings (latest video, next drop, API key)
assets/css/style.css    all the styling
assets/fonts/           Black Han Sans + Tiny5 (self-hosted, OFL licence)
assets/img/             pixel-art sprites
CNAME                   tells GitHub your domain is www.ducklops.com
.nojekyll               tells GitHub to serve the files as-is
```

---

## 1. Put it on GitHub

1. Sign in at github.com → **New repository**. Name it anything (e.g. `ducklops-site`), set it to **Public**, tick nothing else, **Create**.
2. On the empty repo page click **uploading an existing file**.
3. Unzip the download, open the `ducklops-site` folder, select **everything inside it** (not the folder itself) and drag it into the browser. Folders upload fine.
   - `.nojekyll` is a hidden file. On a Mac press **Cmd+Shift+.** in Finder to see it; on Windows tick **View → Hidden items**. If it doesn't go up, use **Add file → Create new file**, name it `.nojekyll`, leave it empty and commit.
4. Click **Commit changes**.

## 2. Turn on GitHub Pages

1. Repo → **Settings → Pages**.
2. **Source:** Deploy from a branch. **Branch:** `main`, folder `/ (root)` → **Save**.
3. Wait a minute or two. The address appears at the top of that page.

## 3. Point ducklops.com at it

The `CNAME` file already says `www.ducklops.com`. In **Settings → Pages → Custom domain** type `www.ducklops.com` and Save if it isn't filled in.

Then at whoever you bought the domain from (the DNS settings page), remove the old Google Sites records and add:

| Type  | Name / Host | Value                     |
|-------|-------------|---------------------------|
| CNAME | `www`       | `YOUR-GITHUB-USERNAME.github.io` |
| A     | `@`         | `185.199.108.153`         |
| A     | `@`         | `185.199.109.153`         |
| A     | `@`         | `185.199.110.153`         |
| A     | `@`         | `185.199.111.153`         |

Also remove the custom URL from your Google Site (Google Sites → Settings → Custom domains) so it stops claiming the domain.

DNS can take a few hours. Once GitHub shows the domain as working, tick **Enforce HTTPS** on the Pages settings screen.

> Before the domain is switched over, the site also works at `https://YOUR-USERNAME.github.io/REPO-NAME/` — everything except the 404 page, which expects to be at the root of the domain.

Old links keep working: `ducklops.com/home` and every old `ducklops.com/readables/videos/...` link (e.g. in your video descriptions) redirect to the new pages.

---

## Everyday updates

### The easy way: the Console
Go to **www.ducklops.com/admin/**. From there you can set the next video drop (and mark it as delayed), switch the banner and pop-up on or off, edit the taskbar ticker, write and edit Readables (with a preview), add corrections and update the members wall. Nothing goes live until you press **Publish**, and everything you changed goes up together in one commit. The site updates about a minute later.

**First time only:** the Console needs a GitHub key so it can save to your repo. It shows the steps on its log-on screen, but in short:
1. Open https://github.com/settings/personal-access-tokens/new
2. Name it *Ducklops console*, pick an expiry, choose **Only select repositories** → your website repo.
3. Under **Repository permissions**, set **Contents** to **Read and write**.
4. **Generate token**, copy it, paste it into the Console. Tick *Remember on this device* so you only do this once per device.

The key is kept in that browser only and can't touch anything except this repo. When it expires, make a new one the same way. The `/admin/` page itself is public but does nothing without a key, and it's hidden from search engines.

If you also edit files directly on GitHub, the Console always loads the latest version when you open it. If something changes on GitHub while you have it open, it will tell you rather than overwrite it.

### By hand
The sections below are how to make the same changes directly on GitHub, if you ever need to.

To change a file on GitHub: open it → pencil icon (**Edit**) → change → **Commit changes**. The site updates in about a minute.

### New video
Edit `assets/js/config.js` → `latestVideo`: paste the video ID (the bit after `youtu.be/`), title and a one-line blurb.
For a countdown, set `nextVideo.date`, e.g. `"2026-10-18T18:00"`. Clear it back to `""` afterwards.
If it slips, set `nextVideo.pushedBack` to the number of days (e.g. `7`) to show the old date crossed out. Set it back to `0` afterwards.

### Scrolling banner
Edit `assets/js/config.js` → `banner`. Set `on: true` to show it across the top of every page, `on: false` to hide it. Put your lines in `messages` (each in quotes, comma between them). `link` is optional and makes the banner clickable.

### Pop-up notice
Edit `assets/js/config.js` → `popup`. Set `on: true` and write your `message` (`\n` starts a new paragraph). Each visitor sees it once. For a new notice that everyone should see again, change `id` to something new, e.g. `"notice-2"`. `on: false` turns it off.

### New Readable
1. **Add file → Create new file**, name it `readables/posts/your-slug.md`, paste the article and commit.
   Formatting: `## Heading`, blank line between paragraphs, `*italic*`, `**bold**`, `[link text](https://…)`, `> quote`, `- list item`. `{{youtube VIDEO_ID}}` on its own line embeds a video.
2. Edit `readables/posts.js` and copy a block to the **top** of the list. `slug` must match the file name. Keep the comma after each `}`.
3. To show something as Coming Soon, add `status: "soon"` (no `.md` file needed yet).

### New correction
Edit `corrections/index.html`. There's a commented template block near the top with instructions: copy it, fill it in, and add a line to the contents list.

### New member on the Memberships page
Edit `memberships/index.html`, find `<ul class="hall-list">` and add `<li>Name</li>`.

### Your AI statement (AI.TXT)
Edit `ai/index.html`. Find the comment that says **WRITE YOUR STATEMENT HERE** and replace the placeholder paragraphs with your own (each paragraph inside `<p> … </p>`). Update the **Modified** date in the Properties box below it when you change it.

It's deliberately not in the main menu. People find it by moving, minimising or closing the Welcome window on the desktop (the `ai.txt` file is hiding underneath), in the Start menu, or via the yellow **AI.TXT / Read me** badge in every page's footer.

### Your logo
Upload it as `assets/img/logo.png` (square works best). It appears beside the wordmark automatically.

---

## Optional: live subscriber count

Without this, the "Join the flock" gadget shows a subscribe link. With it, the home page shows your live subscriber count and picks up your latest upload by itself.

1. Go to console.cloud.google.com → create a project.
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Click the key → **Application restrictions: Websites** → add `https://www.ducklops.com/*` and `https://ducklops.com/*`. **API restrictions:** restrict to YouTube Data API v3. Save.
5. Paste the key into `youtubeApiKey` in `assets/js/config.js`.

The key is visible to anyone who views the page source. That is normal for this kind of key; the website restriction in step 4 stops other sites from using it.

---

## Notes

- Fonts are hosted inside the site (no Google Fonts call), so nothing is loaded from Google except YouTube thumbnails.
- Previewing locally: the pages open fine by double-clicking, but folder links and article text only work through a web server. Easiest is to just push to GitHub and check there, or run `python3 -m http.server` in the folder and open http://localhost:8000.
- Respects "reduce motion": people who turn animations off get a still pond.
- Sounds are synthesised quacks, only when someone clicks a duck. The speaker button on the taskbar mutes them.
