/* =====================================================================
   DUCKLOPS — SITE SETTINGS
   This is the one file to edit for day-to-day changes.
   ===================================================================== */

window.DUCKLOPS_CONFIG = {

  /* --- Your YouTube channel ------------------------------------------- */
  channelId: "UCfzosx6K6cPJolK7zgRDAqg",
  channelUrl: "https://youtube.com/@ducklops",
  joinUrl: "https://www.youtube.com/channel/UCfzosx6K6cPJolK7zgRDAqg/join",

  /* --- OPTIONAL: live subscriber count + automatic "latest video" -----
     Paste a YouTube Data API v3 key here (see README, step 6).
     Leave it as "" and the site just uses latestVideo below.           */
  youtubeApiKey: "",

  /* --- Latest video (used when there's no API key) -------------------- */
  latestVideo: {
    id: "ZwOKMdkDIJE",                 // the bit after youtu.be/
    title: "Timberborn Update 1.1",
    blurb: "A look at everything new in Timberborn’s 1.1 update. Pull up a chair and watch along."
  },

  /* --- Next video drop ------------------------------------------------
     Put a date/time to show a live countdown, e.g. "2026-10-18T18:00".
     Leave as "" to show "DATE TO BE ANNOUNCED".                         */
  nextVideo: {
    date: "",
    label: ""                          // optional, e.g. "Planet Zoo vs ZT2"
  },

  /* --- Messages that scroll along the desktop taskbar ----------------- */
  ticker: [
    "Welcome to DucklopsOS. Mind the ducks.",
    "Duck tier members get new videos early!",
    "Prefer reading? Every review lives in Readables.",
    "Spotted a mistake? It's probably on the Corrections page already.",
    "Tip: click the bread."
  ]
};
