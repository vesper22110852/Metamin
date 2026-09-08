# Metamin

Seokmin Kim's research site. Plain HTML and CSS, with a small optional script for the footer year.

- Website: [vesper22110852.github.io/Metamin/](https://vesper22110852.github.io/Metamin/)
- Repository: [vesper22110852/Metamin](https://github.com/vesper22110852/Metamin)

## Local preview

Run from this folder in PowerShell:

```powershell
.\preview.ps1
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Stop the server with Ctrl+C. Use `-Port 4174` if the default port is occupied. No packages or build tools are needed.

## Editing

- `index.html`: short introduction, selected publication, latest notes.
- `research.html` and `research/`: research index and summaries.
- `publications.html`: publication list.
- `notes.html` and `notes/`: notes index and posts.
- `about.html`: profile.
- `assets/site.css`: colors, typography, spacing, responsive layout.
- `sitemap.xml`: canonical URLs of published pages.

Use relative links for regular pages so local previews and the `/Metamin/` project site both work. The 404 page uses project-root links because a missing URL can be arbitrarily nested.

Notes is intentionally empty. The previous auto-generated note is unlisted and marked `noindex`; its original content remains in Git history. Add only content reviewed by the site owner. CV, email, photograph, affiliation, and project details can be added when supplied.

## Deployment

Push to `main`. GitHub Actions stages only website files and publishes them to GitHub Pages. Settings → Pages → Source is **GitHub Actions**.

Development files such as this README and `preview.ps1` are excluded from the Pages artifact.

## Renewal copy examples

- ~~Engineering light, one resonance at a time.~~ → Seokmin Kim
- ~~From physical mechanism to designed response.~~ → Research
- ~~Published work, without the résumé fog.~~ → Publications
- ~~Curious about light. Serious about evidence.~~ → About

The previous decorative diagrams, quotes, unconfirmed projects, and draft-post listings have been removed from the site. Prior versions are preserved in Git history.
