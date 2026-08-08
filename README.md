# Da Eun Yoon — Voice Artist Website

A handcrafted, static promotional website. There is no Squarespace template, database, build step, or paid website platform required.

## Add your voice

Put your MP3 files in `assets/audio/` with the file names listed in [assets/README.md](assets/README.md). The players work immediately once those files are present.

## Publish for free

The simplest long-term setup is GitHub Pages or Cloudflare Pages:

1. Create a free GitHub account and upload these files to a new repository.
2. In repository **Settings → Pages**, choose the `main` branch and the root folder.
3. Connect `deaunyoonvoiceoverartist.com` in the Pages custom-domain settings and update its DNS records where you bought the domain.

The hosting can be free; keep your domain registration active so you retain the address. Before cancelling Squarespace, move your audio/images into this project, point the domain here, and confirm the new site works on the live domain.

## Edit the words

Everything visible lives in `index.html`. Colors and layout are in `styles.css`. The small audio-player behavior is in `script.js`.
