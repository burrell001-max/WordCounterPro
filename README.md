# WordCounterPro – setup

Plain HTML/CSS/JS. No build step, no server. Upload the contents of this folder (not the folder itself) to a GitHub repository.

## 1. Fill in your details (2 minutes)
1. Open `assets/site.js` and set `email`, and later `adsenseClient` and `adSlots`.
2. Find & replace `https://YOUR-DOMAIN.com` with your real address in every file (canonical tags, `sitemap.xml`, `robots.txt`).
3. Optional: paste a Formspree/Basin form URL into `formEndpoint` so the contact form sends directly instead of opening the visitor's email app.

## 2. Publish on GitHub Pages
1. Create a repository, upload these files to the root.
2. Settings > Pages > Deploy from branch > `main` / root.
3. For AdSense, use your own domain: Settings > Pages > Custom domain, then add the DNS records GitHub shows you. Turn on "Enforce HTTPS".

## 3. AdSense checklist
- Add your site in AdSense and verify it. Ads stay off until `adsenseClient` is filled in.
- Put the exact line AdSense gives you into `ads.txt`.
- Ad slots exist at `data-slot="inarticle"` and `data-slot="sidebar"`. Paste each ad unit's ID into `adSlots`.
- If you have visitors in the EEA, UK or Switzerland, Google requires a certified consent management platform (CMP). Set one up in AdSense > Privacy & messaging.
- Have the privacy policy reviewed for your situation; it is a general template, not legal advice.

## Files
- `index.html` – the tool plus its SEO content and FAQ
- `assets/app.js` – all editor features; `assets/site.js` – settings, ads, contact form; `assets/style.css`
- `about, contact, tools, privacy, terms, sitemap, blog` pages, `404.html`, `robots.txt`, `sitemap.xml`, `ads.txt`
