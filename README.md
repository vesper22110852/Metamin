# Metamin

Seokmin Kim's academic research site. Plain HTML, CSS, and a small optional footer-year script; no build dependencies.

- Website: [vesper22110852.github.io/Metamin/](https://vesper22110852.github.io/Metamin/)
- Repository: [vesper22110852/Metamin](https://github.com/vesper22110852/Metamin)

## Design

The academic profile layout is independently implemented, with visual inspiration from [Gun-Yeal Lee's site](https://gunyeal.github.io/): a light background, white rounded panels, blue accents, portrait beside the introduction, and a compact publication list. No biography, affiliation, publication artwork, or source code was copied from that site. The accent color is now `#004C98`, with link blue `#1155A7`, both used in [KAIST's website stylesheet](https://www.kaist.ac.kr/kr/css/layout.css?ver=1.2). Only the palette is referenced; no KAIST affiliation, logo, or endorsement is implied.

Home uses the owner's supplied photograph, email, Google Scholar profile, and LinkedIn profile. Personal details not supplied by the owner are not filled in.

## Local preview

Run from this folder in PowerShell:

```powershell
.\preview.ps1
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Stop the server with Ctrl+C. Use `-Port 4174` if the default port is occupied. No packages or build tools are needed. Core content and navigation work without JavaScript.

## Editing

- `index.html`: portrait, short introduction, contact links, featured publication, notes.
- `research.html` and `research/`: research index and summaries.
- `publications.html`: publication list and Google Scholar link.
- `notes.html` and `notes/`: notes index and posts.
- `about.html`: profile, contact information, and CV download area.
- `assets/site.css`: shared colors, typography, panels, and responsive layout.
- `assets/portrait.jpg`: public photo; original pixels and color profile preserved, EXIF and editing metadata removed.
- `sitemap.xml`: canonical URLs of published pages.

Use relative links for regular pages so local previews and the `/Metamin/` project site both work. The 404 page uses project-root links because a missing URL can be arbitrarily nested.

Notes is intentionally empty. The previous auto-generated note is unlisted and marked `noindex`; its original content remains in Git history. Add only content reviewed by the site owner.

The earlier phase-mask animation is no longer loaded by any page. Its `assets/home.css`, `assets/metasurface.js`, `assets/phase-model.mjs`, and analytic tests are retained for possible reuse, rather than deleting earlier work.

### Contact information

- Email: `ffnvkd1221@gmail.com`
- Google Scholar: `https://scholar.google.com/citations?hl=en&user=9jJYjVEAAAAJ`
- LinkedIn: `https://www.linkedin.com/in/seokmin-kim-969104386/`
- GitHub: `https://github.com/vesper22110852`

Contact links appear on Home, About, and shared footers. Keep these copies synchronized. No citation metrics or profile details are inferred from external accounts.

### Add the CV when supplied

1. Save the reviewed PDF as `assets/Metamin-CV.pdf`.
2. In `about.html`, replace the disabled CV button with `<a class="cv-download" href="assets/Metamin-CV.pdf" download>Download CV ↓</a>`.
3. Remove the “Not uploaded yet.” message. Do not enable a download before its file exists.

Home's CV link goes to this section and is not a fake download.

### Photograph preparation

`scripts/prepare-portrait.mjs` creates a separate public JPEG while stripping EXIF, Photoshop metadata, and comment segments. It does not crop, retouch, or re-encode the image. It refuses to overwrite an existing destination or the original source.

### Checks

Run `node --test --test-isolation=none tests/*.test.mjs` with a recent Node.js version. Tests cover local links and assets, exact supplied contact destinations, CV state, photo metadata, theme consistency, and the retained analytic illustration.

## Deployment

Push to `main`. GitHub Actions stages only website files and publishes them to GitHub Pages. Settings → Pages → Source is **GitHub Actions**.

README, scripts, tests, and preview files are excluded from the Pages artifact.

## Current copy changes

- Accent palette: ~~burgundy (`#8D2638`)~~ → KAIST website blue (`#004C98`); layout and content unchanged.

- Home ~~Wavefront shaping.~~ → Seokmin Kim.
- ~~An ideal phase mask for focusing and beam steering.~~ → Metasurfaces & inverse design.
- ~~Selected work~~ → Featured publication.
- Added the supplied email, Google Scholar, and LinkedIn links; CV remains unavailable until the document is supplied.
