/* =====================================================================
   DUCKLOPS — SITE SETTINGS
   This is the one file to edit for day-to-day changes.
   ===================================================================== */

window.DUCKLOPS_CONFIG = {

  /* --- Your YouTube channel ------------------------------------------- */
  channelId: "UCfzosx6K6cPJolK7zgRDAqg",
  channelUrl: "https://youtube.com/@ducklops",
  joinUrl: "https://www.youtube.com/channel/UCfzosx6K6cPJolK7zgRDAqg/join",

  /* --- Live subscriber count + automatic "latest video" --------------
     No API key lives here any more. A GitHub Action (see README) fetches
     your stats every few hours using a private repo secret and saves
     them to assets/data/youtube.json, which this site reads.           */

  /* --- Latest video (used when there's no API key) -------------------- */
  latestVideo: {
    id: "ZwOKMdkDIJE",                 // the bit after youtu.be/
    title: "Timberborn Update 1.1",
    blurb: "A look at everything new in Timberborn’s 1.1 update. Pull up a chair and watch along."
  },

  /* --- Next video drop ------------------------------------------------
     date: release time in UK time, e.g. "2026-10-18T18:00". Shows a live
     countdown on the home page. Leave as "" to show "DATE TO BE ANNOUNCED".
     label: the video's title.
     url: the YouTube link, once you have it (optional).
     pushedBack: number of days it slipped. Shows the old date crossed out
     under the countdown. Set back to 0 for the next video.

     EVENT MODE: for the 6 hours before the date, everyone who opens the
     site lands on the countdown stage (ducklops.com/special), with pyro
     and confetti at release. 30 minutes after, the site goes back to
     normal by itself. eventMode: false skips it for this video.        */
  nextVideo: {
    date: "2026-10-18T16:30",
    label: "I Counted Down EVERY Dinosaur in Prehistoric Kingdom",
    url: "https://youtu.be/IpnuKrPoOUM",
    pushedBack: 7,
    eventMode: true
  },

  /* --- Scrolling banner across the top of every page ------------------
     on: true to show it, false to hide it.
     messages: one or more lines; they scroll past one after another.
     link: optional, makes the banner clickable, e.g. "readables/".     */
  banner: {
    on: true,
    messages: [
      "Coming Sunday: I Counted Down EVERY Dinosaur in Prehistoric Kingdom",
      "Duck tier members get videos early."
    ],
    link: "https://www.youtube.com/channel/UCfzosx6K6cPJolK7zgRDAqg/join",
    speed: 40                          // pixels per second; lower = slower
  },

  /* --- Pop-up notice ---------------------------------------------------
     on: true to show it, false to turn it off.
     Visitors only see it once. To show a NEW notice to everyone again,
     change the id (any word, e.g. "notice-2").
     homeOnly: true = only on the home page, false = whichever page
     they land on first.                                                 */
  popup: {
    on: true,
    id: "notice-5",
    title: "NOTICE.TXT",
    message: "Coming Sunday: I Counted Down EVERY Dinosaur in Prehistoric Kingdom\nThe video is a week late, and a long time coming, but I spent a lot of time making it so I hope you enjoy it.",
    button: "OK",
    link: "https://www.youtube.com/channel/UCfzosx6K6cPJolK7zgRDAqg/join",                          // optional extra button, e.g. "https://youtu.be/..."
    linkText: "Access early",
    homeOnly: true,
    delay: 1.5                         // seconds before it appears
  },

  /* --- Messages that scroll along the desktop taskbar ----------------- */
  ticker: [
    "Welcome to DucklopsOS. Mind the ducks.",
    "Duck tier members get new videos early!",
    "Prefer reading? Every review lives in Readables.",
    "Spotted a mistake? Check the Corrections page, then let me know!",
    "Tip: click the bread.",
    "Psst. Something's hiding behind the Welcome window...",
    "This weather we're having - am I right?",
    "Weeeeeeeeeeeeeeeeeeeeeeeeeeee!"
  ]
};
