/* =====================================================================
   DUCKLOPS READABLES — POST LIST
   ---------------------------------------------------------------------
   To add a new Readable:
   1. Save your article as a Markdown file in  readables/posts/
      e.g.  readables/posts/my-new-review.md
   2. Copy one of the blocks below, paste it at the TOP of the list,
      and fill it in. "slug" must match the file name (without .md).
   3. Upload both files to GitHub. Done.

   Fields:
     slug     – file name in readables/posts/ (no .md)        [required]
     title    – headline shown on the site                    [required]
     videoId  – the YouTube ID (the bit after youtu.be/)      [optional]
     author   – "Written by"                                  [optional]
     editor   – "Edited by"                                   [optional]
     date     – "2026-10-01" format                           [optional]
     tags     – e.g. ["Review"]  (Review, Comparison, List, Update…)
     summary  – one or two sentences for the card             [optional]
     minutes  – reading time; leave out and it's worked out   [optional]
     status   – "soon" shows a Coming Soon card with no link  [optional]

   Keep the commas between blocks! Every block ends with  },
   ===================================================================== */

window.READABLES = [
  {
    slug: "i-didnt-realise-how-awesome-timberborn-1-1-is",
    title: "I Didn’t Realise How AWESOME Timberborn 1.1 is…",
    videoId: "ZwOKMdkDIJE",
    author: "Harry",
    date: "2026-09-20",
    tags: ["Update"],
    summary: "For the last week or so, I’ve been elbow-deep in one of the biggest updates Timberborn has ever had and I’d love to tell you all about it. There’s new maps, new ways to build, new snazzy outfits, and a lot more."
  },
  {
    slug: "14-things-i-wish-were-in-prehistoric-kingdom",
    title: "14 Things I WISH Were in Prehistoric Kingdom",
    videoId: "xm8cMZBdrM8",
    author: "Harry",
    tags: ["List"],
    summary: "Aviaries, lagoons, bug houses, breakouts and a giant caiman: the fourteen features the community (and I) want most in Prehistoric Kingdom.",
    minutes: 10
  },
  {
    slug: "prehistoric-kingdom-re-review-has-anything-changed-in-1-year",
    title: "Prehistoric Kingdom Re-Review: Has Anything Changed In 1 Year?",
    videoId: "n3hyHVPRtzY",
    author: "Harry",
    tags: ["Review"],
    summary: "A year ago it got a 6.5. Breeding, aging, health systems and a big performance boost later, does it earn a higher score?",
    minutes: 9
  },
  {
    slug: "i-didnt-expect-this-from-parkitect-review",
    title: "I Didn’t Expect This From Parkitect! [Review]",
    videoId: "rBCWokBpuCs",
    author: "Harry",
    editor: "LeackyBee",
    tags: ["Review"],
    summary: "It looks like nostalgia with a fresh coat of paint. Underneath is one of the most thoughtful management sims around.",
    minutes: 8
  },
  {
    slug: "zoo-tycoon-2-vs-jpog",
    title: "Zoo Tycoon 2 vs JPOG - Which Game Holds Up Better?",
    author: "Harry",
    date: "2025-12-30",
    tags: ["Comparison"],
    summary: "Two absolute classics in the zoo management genre, with both clear differences and genuine similarities. Just months separate their releases, but is there a clear winner between the two? Let’s find out!"
  },
  {
    slug: "jwe2-vs-jpog-2025",
    title: "Jurassic World Evolution 2 vs Jurassic Park: Operation Genesis [2025]",
    tags: ["Comparison"],
    status: "soon"
  },
  {
    slug: "planet-zoo-but-weird-mars-attracts-review",
    title: "Planet Zoo... but Weird? | Mars Attracts Review",
    videoId: "2ZAW8F2a2to",
    author: "Harry",
    tags: ["Review"],
    summary: "A park-management sim set in the Mars Attacks universe, where the exhibits are humans. Bizarre, but is it any good?",
    minutes: 9
  },
  {
    slug: "everything-you-missed-in-prehistoric-kingdom-update-15",
    title: "Everything YOU Missed In Prehistoric Kingdom Update 15",
    videoId: "8erTvYb7ZEU",
    author: "Harry",
    tags: ["Update"],
    summary: "Breeding seasons, nests, a landscaping overhaul, 30+ Mesozoic plants and a brand new Management research tree.",
    minutes: 4
  }
];
