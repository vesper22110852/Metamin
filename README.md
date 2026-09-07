# Metamin

Research portfolio and technical blog for Seokmin Kim, focused on metasurfaces, inverse design, RCWA, FDTD, and computational nanophotonics.

## Preview locally

The site uses plain HTML, CSS, and JavaScript, so it has no package installation or build step.

From PowerShell, run:

```powershell
.\preview.ps1
```

Then open `http://127.0.0.1:4173/`. Press `Ctrl+C` in PowerShell to stop the preview server.

Opening `index.html` directly also works, but the local server reproduces web hosting behavior more accurately.

## Publish with GitHub Pages

1. Create a repository named `Metamin` (already created).
2. Add `https://github.com/vesper22110852/Metamin.git` as this folder's `origin` remote.
3. Push the current branch (`main` is recommended; `master` is also supported).
4. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.

The workflow in `.github/workflows/deploy.yml` deploys the static site after each push to `main` or `master`.

The default project-site address is `https://vesper22110852.github.io/Metamin/`.

> GitHub Pages from a private repository requires a paid GitHub plan that supports private-repository Pages. The published Pages website is public even when its source repository is private.

## Content map

- `index.html` — Home
- `research.html` — Research index
- `research/` — Research stories
- `notes.html` — Writing index
- `notes/` — Technical notes
- `publications.html` — Publication record
- `about.html` — Researcher profile and contact
- `assets/site.css` — Design system and responsive layout
- `assets/site.js` — Mobile navigation and small enhancements

## Before public launch

- Add a public research email address.
- Confirm the preferred institutional affiliation wording.
- Replace the About-page brand placeholder if a portrait is desired.
- Add an Open Graph preview image.
- Review every technical statement and author-contribution description.
