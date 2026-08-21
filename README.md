# Da Eun Yoon — Voice Actor & Storyteller Website

A handcrafted, multi-page promotional website. There is no Squarespace template, database, build step, or paid website platform required.

## Pages

- `index.html` — theatrical curtain opening, featured demos, published work and studio
- `about.html` — childhood story, personal life, training and Esme’s corner
- `commercial.html` — English and Korean commercial reels
- `audiobook.html` — featured reel, six genre samples and published work
- `animation.html` — English and Korean animation reels
- `contact.html` — email-based inquiry page

## Add your voice

The previous Squarespace demos, photos and videos have been copied into `assets/`. The only missing recording is the new theatrical welcome. Record the text in `OPENING_SCRIPT.md` and save it as `assets/audio/opening-welcome.mp3`. Until then, the opening temporarily falls back to the commercial reel so visitors still hear Da Eun’s voice.

## Publish for free

The simplest long-term setup is GitHub Pages or Cloudflare Pages:

1. Create a free GitHub account and upload these files to a new repository.
2. In repository **Settings → Pages**, choose the `main` branch and the root folder.
3. Connect `deaunyoonvoiceoverartist.com` in the Pages custom-domain settings and update its DNS records where you bought the domain.

The hosting can be free; keep your domain registration active so you retain the address. Before cancelling Squarespace, move your audio/images into this project, point the domain here, and confirm the new site works on the live domain.

## Edit the words

Each page has its own HTML file. Shared colors and layout are in `styles.css`; curtain, navigation, reveal and audio-player behavior are in `script.js`.
