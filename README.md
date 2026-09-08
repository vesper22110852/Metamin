# Metamin

Seokmin Kim's research site. Plain HTML, CSS, and JavaScript; no build dependencies.

- Website: [vesper22110852.github.io/Metamin/](https://vesper22110852.github.io/Metamin/)
- Repository: [vesper22110852/Metamin](https://github.com/vesper22110852/Metamin)

## Local preview

Run from this folder in PowerShell:

```powershell
.\preview.ps1
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Stop the server with Ctrl+C. Use `-Port 4174` if the default port is occupied. No packages or build tools are needed.

## Editing

- `index.html`: interactive wavefront illustration, selected publication, notes.
- `research.html` and `research/`: research index and summaries.
- `publications.html`: publication list.
- `notes.html` and `notes/`: notes index and posts.
- `about.html`: profile and CV download area.
- `assets/site.css`: colors, typography, spacing, responsive layout.
- `assets/home.css`: home-only dark visual layout.
- `assets/metasurface.js`: canvas renderer, mode controls, motion preferences.
- `assets/phase-model.mjs`: analytic phase profiles and ray construction.
- `sitemap.xml`: canonical URLs of published pages.

Use relative links for regular pages so local previews and the `/Metamin/` project site both work. The 404 page uses project-root links because a missing URL can be arbitrarily nested.

Notes is intentionally empty. The previous auto-generated note is unlisted and marked `noindex`; its original content remains in Git history. Add only content reviewed by the site owner. CV, email, photograph, affiliation, and project details can be added when supplied.

## Home visual

The home illustration is an **ideal scalar phase mask**, not a fabricated geometry, inverse-design process, RCWA/FDTD result, or result from the publication below it. Surface colors encode phase (0–2π), not wavelength or efficiency. Rays are straight in the output medium; moving marks indicate constant phase. Coordinates use arbitrary, consistent units and the time convention `Re{E exp(-iωt)}`.

- Focus: `φ(x,y) = -k(√(x²+y²+f²) - f)`.
- Steer: `φ(x,y) = k x sin(θ)`.
- Markers: `φ + k s - ωt = 2πm`.

References: [Phase characterisation of metalenses](https://www.nature.com/articles/s41377-021-00492-y), [Light propagation with phase discontinuities](https://pubmed.ncbi.nlm.nih.gov/21885733/).

Focus / Steer selects the construction. Pause / Play controls motion. Reduced-motion preferences start paused, and animation stops when the illustration or browser tab is hidden. A static SVG remains if JavaScript or canvas is unavailable. Open through the local server: ES modules do not reliably load from a `file://` URL.

### Add the CV when supplied

1. Save the reviewed PDF as `assets/Metamin-CV.pdf`.
2. In `about.html`, replace the disabled CV button with `<a class="cv-download" href="assets/Metamin-CV.pdf" download>Download CV ↓</a>`.
3. Remove the “Not uploaded yet.” message. Do not enable a link before its file exists.

### Code-level checks

Run `node --test tests/*.test.mjs` with a recent Node.js version. These cover phase/ray consistency, motion controls and fallbacks with a mocked canvas, plus local asset/link integrity. They do not replace visual browser testing.

## Deployment

Push to `main`. GitHub Actions stages only website files and publishes them to GitHub Pages. Settings → Pages → Source is **GitHub Actions**.

Development files such as this README and `preview.ps1` are excluded from the Pages artifact.

## Renewal copy examples

- ~~Engineering light, one resonance at a time.~~ → Seokmin Kim
- ~~From physical mechanism to designed response.~~ → Research
- ~~Published work, without the résumé fog.~~ → Publications
- ~~Curious about light. Serious about evidence.~~ → About

The previous decorative diagrams, quotes, unconfirmed projects, and draft-post listings have been removed from the site. Prior versions are preserved in Git history.

### Visual-home update

- Home ~~Seokmin Kim + personal introduction~~ → Wavefront shaping + interactive phase mask.
- About ~~Metasurfaces · Inverse design~~ → Metasurfaces · Inverse design · Structural color.
- CV download → clearly disabled until the owner provides the document.
