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
     Put a date/time to show a live countdown, e.g. "2026-10-18T18:00".
     Leave as "" to show "DATE TO BE ANNOUNCED".
     pushedBack: number of days it slipped. Shows the old date crossed out
     under the countdown. Set back to 0 for the next video.               */
  nextVideo: {
    date: "2026-10-18T16:30",
    label: "",                         // optional, e.g. "Planet Zoo vs ZT2"
    pushedBack: 7
  },

  /* --- Scrolling banner across the top of every page ------------------
     on: true to show it, false to hide it.
     messages: one or more lines; they scroll past one after another.
     link: optional, makes the banner clickable, e.g. "readables/".     */
  banner: {
    on: true,
    messages: [
      "New video Sunday 18th!",
      "Duck tier members get videos early."
    ],
    link: "https://www.youtube.com/channel/UCfzosx6K6cPJolK7zgRDAqg/join",
    speed: 60                          // pixels per second; lower = slower
  },

  /* --- Pop-up notice ---------------------------------------------------
     on: true to show it, false to turn it off.
     Visitors only see it once. To show a NEW notice to everyone again,
     change the id (any word, e.g. "notice-2").
     homeOnly: true = only on the home page, false = whichever page
     they land on first.                                                 */
  popup: {
    on: true,
    id: "notice-3",
    title: "NOTICE.TXT",
    message: "Sunday's video has been pushed back at least 1 week to Sunday the 18th. It's longer than usual but I'm working to get it out ASAP!",
    button: "OK",
    link: "",                          // optional extra button, e.g. "https://youtu.be/..."
    linkText: "Take a look",
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
