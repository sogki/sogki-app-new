# Building a companion for Arc Raiders

I've been running [arcraiders.50andbad.site](https://arcraiders.50andbad.site) for a while now—a web companion for Arc Raiders that lives in the 50andBad ecosystem. No install, no overlay, just a second screen when you're planning a raid or need to look something up mid-session.

---

## Why a web app?

Most Arc Raiders tools are desktop overlays or mobile apps. I wanted something you could open in a tab and forget about. Phone, tablet, laptop—doesn't matter. The item database alone has 483 items, 19 ARC enemies, and a bunch of quests. When you're trying to remember if that random drop is worth keeping, having it one tab over beats alt-tabbing to a separate app.

The events tracker was the thing I cared about most. Matriarch, Hurricane, Locked Gate, Uncovered Caches—they all run on a schedule, and the site shows live countdowns so you know when to log in. No more guessing or keeping a spreadsheet.

---

## What's actually there

**Item database** — Filter by type (weapons, augments, blueprints, materials, etc.) and rarity. Each item has its own page with coin value and description. The data's solid; I've been curating it as the game updates.

**Interactive maps** — Five battlegrounds (Dam, Spaceport, Buried City, Blue Gate, Stella Montis) with markers and intel. We're using [arcraidersmaps.app](https://arcraidersmaps.app/) under the hood for the heavy lifting. Each map has coordinates and a fullscreen option if you want it on a second monitor.

**Events** — 26-hour timeline, live countdowns, all the event types. The homepage shows a few active ones; the full events page has the schedule.

**Raid planner** — This one's still cooking. Task lists with categories (General, Quest, Item, Daily), but persistence is probably local for now. We're also working on a desktop companion app, and the Blueprints Heatmap is the newest addition. More on that later.

---

## Stuff I'd change

The favorites feature exists but doesn't persist—that's on the list. There's also a weird mismatch: the database page shows 40 quests, the homepage shows 84. Could be different data sources or a bug. Either way, I need to sort that out.

The "we're working hard on a desktop app" message on the homepage is honest but maybe a bit apologetic. The web app does a lot already. I'd rather lean into what's there than undersell it.

---

## The stack

Next.js, React, TypeScript, Supabase, PostgreSQL. Same stack as the rest of the 50andBad stuff. Keeps things consistent and lets me move fast when the game drops new content.

---

## Where it's going

The Blueprints Heatmap is the latest thing—I'm pretty excited about it. The raid planner will get proper persistence. And when the desktop companion lands, I want a clear path between web and desktop so people can use whichever fits their setup.

If you're a Raider and you haven't checked it out: [arcraiders.50andbad.site](https://arcraiders.50andbad.site). Discord's linked if you want to squad up or share map intel.
