# Working on this site

Notes for any AI assistant or developer editing this repository. Read them before changing anything.

## What this is

A handmade static site — plain HTML, one stylesheet (`styles.css`), one script (`script.js`). No build step, no packages.

**This repository is public, and `master` is the live site.** GitHub Pages serves it at daeunyoonvoice.com (`CNAME`, `.nojekyll`); a push to `master` is live within a couple of minutes. Everything committed is public — including metadata hidden inside images — and stays in the history even after it is deleted. (`README.md` predates the move and says `main`; the branch is `master`.)

## Where things are

| What | Where |
|---|---|
| Pages | `index.html` `about.html` `audiobook.html` `audiobook-production.html` `animation.html` `commercial.html` `authors.html` `alpha-beta-reading.html` `language-services.html` `contact.html` |
| Photos | `assets/images/<page>/` — `home`, `about`, `contact`, `opening` |
| Audio, video, PDFs | `assets/audio/`, `assets/video/`, `assets/docs/` |
| Look and behaviour | `styles.css`, `script.js` (curtain opening, navigation, reveal, audio players) |
| Old Squarespace URLs | `_redirects` (GitHub Pages ignores this file; it is kept for a future move) |

## Adding a photo

1. **Take the location out first.** Phones record where every photo was taken. Run:

   ```
   node tools/prep-photo.cjs <original> assets/images/<page>/<name>.jpg
   ```

   It removes GPS, camera and time data, resizes to 1800px on the long edge, keeps the picture the right way up, never overwrites the original, and prints the `width`/`height` to use. It refuses HEIC: export the photo as JPEG first (Photos → File → Export, "Include location information" off).

2. Reference it the way the page already does:

   ```html
   <img src="assets/images/about/<name>.jpg" alt="<what is in the picture>" loading="lazy" decoding="async" width="…" height="…">
   ```

   Always a real `alt`, and the `width`/`height` the script printed.

3. Look at it at phone width (375px) as well as on a desktop.

4. **Commit only the files you changed** — `git add <those paths>`, never `git add -A` or `git commit -a`: there is often unrelated work in progress in this folder. Then `git push origin master`.

To check any image: `mdls -raw -name kMDItemLatitude <file>` must print `(null)`.

## Design rules

- The site reads as one storybook. The plum-and-gold watercolour is the frame behind everything; content sits on parchment laid on top of it (`.tale-sheet`, `.tale-paper`) — never on flat coloured bands.
- Build new sections from the existing `tale-*` pieces (`tale-chapter` with a `tale-chapter-mark`, `tale-cards`, `tale-scraps`, `tale-steps`, `tale-recital` …). Don't invent a new look for one section.
- A page that uses `.tale-paper` must include the `<svg class="tale-defs">` block with the `deckle` filters, or the torn paper edges silently disappear.
- Storybook devices, not casual copy: no "Hi, I'm …!" greetings.
- Small text needs at least 4.5:1 contrast.
- Grids must collapse on phones. In phone media queries set `grid-template-columns` directly — an inline `style="--cols: N"` beats any rule that only changes `--cols`.
- Keep phones light: no new heavy filters, large autoplaying media or full-bleed effects without a phone fallback.
- Browsers block unexpected sound. Audio starts only from a visitor's tap or click.

## Preview

```
python3 -m http.server 4321
```

in this folder, then open http://localhost:4321.
