# Metamin

Seokmin Kim's academic research site. Plain HTML, CSS, and optional JavaScript for the footer year and interactive project schematics; no build dependencies.

- Website: [vesper22110852.github.io/Metamin](https://vesper22110852.github.io/Metamin/).
- Local preview: [127.0.0.1:4173](http://127.0.0.1:4173/).
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

Double-click **Metamin Preview** on the Windows desktop to open the site. `scripts/open-preview.ps1` reuses the running preview or starts a hidden loopback-only server before opening the default browser. `scripts/install-preview-shortcut.ps1` creates the shortcut and its blue M icon.

## Editing

- `index.html`: portrait, short introduction, and contact links.
- `research.html`: ongoing projects; currently Project Blackhole and Project COSMOS, in two compact full-width rows.
- `research/blackhole.html`: owner-approved public concept page, with an interactive schematic and brief principles; actual material choices, dimensions, and performance data remain omitted.
- `assets/project-detail.css`: reusable detail-page visual, controls, and explanation layout.
- `assets/blackhole-scene.mjs` / `assets/blackhole.js`: illustrative SVG geometry and accessible component/animation controls. `assets/blackhole-concept.svg` is the matching static fallback.
- `publications.html` and `publications/`: publication list, paper summaries, and Google Scholar link.
- `assets/paper-summary.css` / `assets/summary-player.mjs`: reusable 20-second publication player. The paper summary autoplays once when first visible. This specific film has an owner-approved reduced-motion exception; the reusable player's default and other animations still respect reduced motion. Pause, restart, seeking and chapter navigation remain available; leaving the view pauses playback without automatic resumption. No looping, audio or external video host.
- `assets/polarization-scene.mjs` / `assets/polarization-summary.js`: first paper's normal-incidence, five-layer color/polarization story. x-pol colors are sampled from published Figure 1(e); a representative cyan from Figure 1(f) summarizes y-pol. Provenance and the original small y-pol differences are recorded in `scripts/polarization-color-samples.json`. The cutaway, vertical scale and polarization transitions are schematic, not reconstructed spectra, measured footage or fabrication evidence. `node scripts/build-polarization-fallback.mjs` regenerates its static SVG fallback.
- `research/`: project detail pages and a compatibility redirect for the former paper-summary URL.
- `notes.html` and `notes/`: research and development notes, scholarship applications, conferences, research life, and other experiences. Notes sits between Publications and About. The owner withdrew the first draft and will write future notes from direct experience; no posts are currently published.
- `assets/notes.css`: responsive post-list and reading layouts; `scripts/templates/note.html` is the unpublished article template.
- `about.html`: profile, contact information, and CV download area.
- `assets/site.css`: shared colors, typography, panels, and responsive layout.
- `assets/portrait.jpg`: public photo; original pixels and color profile preserved, EXIF and editing metadata removed.
- `sitemap.xml`: canonical URLs of published pages.

Use relative links for regular pages so local previews and the `/Metamin/` project site both work. The 404 page uses project-root links because a missing URL can be arbitrarily nested. Shared navigation and ordinary page links use `?v=9`; the shared stylesheet uses `?v=10` for the five-item mobile navigation. Feature assets and summary links have their own cache versions. Canonical URLs remain unversioned.

Notes is visible in navigation, but its empty index is marked `noindex` and excluded from the sitemap. Unpublished drafts must remain outside this public repository and the deployed website. The old `notes/why-decoupling-matters.html` stays an unlisted, `noindex` placeholder with no article body. Add only owner-authorized content. Project descriptions contain only the scope supplied by the owner, without inferred results or performance claims.

### Adding a Note

The site has no browser-based editor or account system. The owner can supply a title, body, and optional photographs in the conversation; add these as a static post after review. Korean and English posts are both supported. Do not invent scholarship results, interview details, conference attendance, dates, or quotations.

1. Copy `scripts/templates/note.html` to `notes/<short-english-slug>.html`. The template itself is excluded from deployment. Replace every `{{TOKEN}}`, set the article language, and use a confirmed post date (distinct from the event date).
2. Use the provided `note-body` layout for headings, paragraphs, lists, and captioned photographs. Check photographs for permission and private information before adding them.
3. Replace the empty state inside `notes.html`'s `.notes-list` with real `.note-card` articles, newest first. Each card has `.note-meta` (category and a `<time datetime="YYYY-MM-DD">`), a linked `h3`, and `.note-excerpt`. Update the post count. Do not show unpublished placeholders as posts.
4. Preview the post and list on desktop and mobile, and run the checks. Keep unreviewed drafts outside the public repository: `noindex` is not access control. Add only ready article URLs to `sitemap.xml`; remove the index's `noindex` once it has reviewed content. Publishing new posts or later changes still requires the owner's approval before pushing.

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

**Public release authorized on 2026-09-30:** The owner requested publication and manually changed the GitHub repository to Public. GitHub Pages uses the existing GitHub Actions deployment workflow. Keep local preview bound to `127.0.0.1`; previewing local edits does not publish them.

Pushing to `main` or `master` triggers deployment; a manual workflow run can also deploy. Do not push unreviewed changes. The workflow stages only website files into the Pages artifact. This authorization applies to the current release, not automatic publication of future work.

README, scripts, tests, and preview files are excluded from the Pages artifact, but repository files and Git history are visible in the public GitHub repository. Do not commit credentials, private drafts, or undisclosed research data.

## Current copy changes

- Draft withdrawn (2026-10-01): at the owner's request, removed the first note from the current public repository, Notes listing, sitemap, and deployment. A local copy is kept outside the public repository. Earlier public Git commits are retained; deleting the current page does not erase publication history. Future prose should be supplied or reviewed by the owner before publication.

- Summary playback: ~~user-started; no autoplay~~ → one-time autoplay when visible, including an owner-approved reduced-motion exception for this paper film only; manual controls remain available.

- Release status (2026-09-30): ~~private development; Pages disabled~~ → owner-approved public release; repository made Public by the owner and Pages configured for the existing deployment workflow.
- Repository safety: ~~private GitHub pushes can be used for backup~~ → the repository and its history are public; only reviewed material may be pushed.

- Navigation: ~~Home / Research / Publications / About~~ → Home / Research / Publications / Notes / About.
- Notes introduction: ~~Research and simulation notes.~~ → 장학금 지원과 면접, 학회에서의 경험, 그리고 일상의 기록.
- Notes empty state: ~~No notes published yet.~~ → 아직 작성된 글이 없습니다. / 직접 겪은 일과 그 과정에서 배운 것들을 이곳에 차곡차곡 기록하려 합니다.

- Publication button: ~~Summary · 20s~~ → Summary. Destination and animation duration are unchanged.

### Floral application concept

Added the approved flower demo to the publication summary, between the device film and citation. It starts at idealized y-pol; x-pol reveals the existing flower artwork using only the five Figure 1 colors. The background also uses a geometry class. The independent controls do not affect the device film. Originally developed locally, it is included in the owner-authorized public release.

- Added heading: **An image revealed by polarization**.
- Added scope: **Concept illustration based on the paper’s color response, not a fabricated or measured image-display device. The flowers and background both use the five geometry classes. Small y-polarized color differences are omitted here. The transition is illustrative, not a calculated polarization sweep.**
- Standalone labels adapted for the English blog: ~~편광으로 드러나는 꽃 / 응용 콘셉트 / 단색 화면 / 꽃 이미지~~ → An image revealed by polarization / Application concept / Uniform color / Flower pattern revealed.
- The original standalone visual is retained separately. The blog uses a native SVG component with no Codex host dependency, no automatic animation and reduced-motion support; a static x-pol illustration remains available without JavaScript.

### Publication wording review

Text-only polish; geometry, colors, layout and animation timing are unchanged. The official paper title and citation are unchanged.

- Page heading: ~~Polarization-selective structural color~~ → Polarization-dependent structural color.
- Browser title: ~~Polarization response in a structural color cavity — Metamin~~ → Polarization-dependent structural color — Metamin.
- Diagram accessibility title: ~~Normal-incidence polarization-selective structural color~~ → Normal-incidence polarization-dependent structural color.
- Film label: ~~PUBLICATION 01 / VISUAL SUMMARY~~ → VISUAL SUMMARY.
- Device title: ~~Five geometries. One layered cavity.~~ → Inside the structural-color cavity.
- Device caption: ~~An Al–SiO₂–Al metamirror, a planarizing dielectric spacer, and a thin Ag top mirror.~~ → An Al–SiO₂–Al metamirror, a planarizing dielectric cavity spacer, and a thin Ag top mirror form the layered device.
- x-pol title (including static fallback heading): ~~Change the short radius. Change the color.~~ → x-polarization: color varies with radius.
- x-pol caption: ~~With x-polarized white light at normal incidence, different ellipse widths produce different reflected colors.~~ → The five short-axis radii produce different reflected colors. The long-axis radius is fixed at 100 nm.
- Static fallback caption: ~~Under x-polarized white light at normal incidence, different ellipse widths produce different reflected colors.~~ → The five short-axis radii produce different reflected colors. The long-axis radius is fixed at 100 nm.
- Rotation title: ~~Only the polarization changes.~~ → Rotate the incident polarization.
- Rotation caption: ~~The ellipse dimensions and the entire layer stack remain fixed.~~ → The polarization rotates from x to y; the geometry and layer stack remain unchanged.
- y-pol title: ~~Different widths. Nearly the same cyan.~~ → y-polarization: similar color across designs.
- y-pol caption: ~~Under y polarization, the reflected color is much less sensitive to the short-axis radius.~~ → The reflected colors remain similar across the same five short-axis radii.
- Result title: ~~Two responses in the same cavity.~~ → Color sensitivity depends on polarization.
- Result caption: ~~Geometry-sensitive in x. Nearly geometry-invariant in y. No change to the device.~~ → The reflected color varies strongly with the short-axis radius for x polarization, but only weakly for y polarization.
- Color note: ~~Colors sampled from the published Figure 1(e–f), at r_y = 100 nm and DCSL = 180 nm. x-pol uses the five published color-map samples; y-pol uses one representative cyan to summarize the small variation in the original. These are rendered-image samples, not original numerical spectra.~~ → Colors are sampled from Figure 1(e–f), with r_y = 100 nm and a dielectric cavity spacer (DCSL) thickness of 180 nm. x-pol shows five sampled colors; y-pol uses one representative cyan to summarize the small variation across designs. These are rendered-image colors, not colors recomputed from spectral data.
- Animation note: ~~Each design is shown as an aligned 2 × 2 array in a transparent cutaway; vertical dimensions are not to scale. White light travels down and disappears before the reflected color grows upward, once per polarization. The two beam stages are shown separately for clarity; travel times are illustrative, not time-resolved simulation results. Polarization transitions are visual interpolation, not a simulated angle sweep or measured footage. Geometry remains fixed.~~ → Each design is illustrated by a 2 × 2 array; vertical dimensions are not to scale. Geometry remains fixed. Illumination and reflection are shown sequentially for clarity. Animation timing and polarization transitions are illustrative, not time-resolved simulations, a calculated polarization sweep, or measured footage.

### Earlier publication and project edits

- Publication action: ~~Paper summary~~ → Summary · 20s. Paper still opens its DOI; Summary opens the local visual explanation.
- Summary heading: ~~Polarization response in a structural color cavity~~ → Polarization-selective structural color.
- Summary body: ~~This paper examines polarization response in a meta-mirror-assisted structural color cavity. The full study is available in Journal of Optics through the DOI below.~~ → a 20-second functional illustration with fixed geometry and changing incident polarization.
- Device caption: ~~One surface. Different nanostructures.~~ → Five geometries. One layered cavity.
- x-pol caption: ~~Different geometries, different colors.~~ → Change the short radius. Change the color.
- y-pol caption: ~~Different geometries, nearly the same color.~~ → Different widths. Nearly the same cyan.
- Result caption: ~~A different color response for each polarization.~~ → Two responses in the same cavity.
- Scope: ~~Colors, spacing and transition timing are illustrative.~~ → Colors sampled from the published Figure 1(e–f), at r_y = 100 nm and DCSL = 180 nm; one representative cyan summarizes the small y-pol variation. These are rendered-image samples, not original numerical spectra. Cutaway, vertical scale and polarization interpolation remain schematic.
- Snapshot navigation: ~~00 The device / 04 x polarization / 09 Rotate / 14 y polarization / 18 Compare~~ → x-pol / y-pol.
- Array annotation: ~~one representative atom per design~~ → 2 × 2 array per design. All 20 atoms share the substrate's projection and fixed grid spacing.
- Motion scope: ~~Enlarged representative unit cells and a transparent cutaway reveal the layer stack~~ → Each design is shown as an aligned 2 × 2 array in a transparent cutaway. White light travels down before reflected color grows upward; travel times and moving highlights are illustrative, not time-resolved simulation results.
- Single-pass revision: ~~White light travels down before the reflected color grows upward~~ → White light travels down and disappears before the reflected color grows upward, once per polarization. ~~travel times and moving highlights~~ → travel times. Incoming and reflected beams never coexist; repeated moving highlights and the duplicate centered Play control are removed.
- Cavity visibility: ~~compact layer spacing and steep projection~~ → enlarged illustrative gap and a lower viewing angle; the middle of every round-trip path remains visible below the opaque upper stack.
- Absorption presentation: ~~short downward light traces~~ → planar loss of brightness across fixed black-matrix boundaries, building after each wavefront arrival; no vertical light needles.
- OLED finish: ~~warm-white emissive band and light-gray top~~ → narrow white emissive band, graphite-toned laminate and restrained edge highlights. Colors remain illustrative, not a material specification.
- Array: ~~irregular RGB arrangement~~ → repeating RG/GB Bayer pattern, cropped to the existing 4-by-3 field; geometry, cavity colors and output beams share the same cell mapping.
- Occlusion: ~~translucent OLED top showing lower ring–disk units~~ → opaque top and fixed opaque backing; upper-stack coverage remains intact when components are highlighted.
- Privacy: ~~owner-approved public concept page~~ → private development; publication remains disabled until the owner requests it.
- Incoming light: ~~one descending white wavefront~~ → three translucent wavefronts retained at the surface, with progressively dimmer fixed-width boundaries after each arrival; illuminated squares never shrink.
- Boundary mechanism: ~~RGB branches fading at the matrix / crosstalk suppression~~ → incident white light absorbed at the ring–disk boundaries, reducing unwanted boundary reflection.
- Cavity: ~~bouncing square packets and rectangular resonance bands~~ → curved up/down paths with tangent-aligned moving arrows; the selected RGB component becomes more prominent over three round trips.
- Absorption cue: ~~small white ring flashes~~ → clipped downward light traces that terminate at ring–disk sites, followed by localized darkening; no reflected boundary paths.
- OLED: ~~two separated tinted panes / Tandem OLED~~ → a joined neutral-colored laminate with one warm-white emissive band / White OLED stack. Internal emitter sequence and materials are not specified; the stack is not separate RGB OLEDs.
- Output: ~~volumetric beams and circular bases on the lower metamirror array~~ → luminous volumetric beams starting at the upper OLED output interface; no lower circular beam bases.
- Sequence: ~~White light down → Boundary absorption → RGB cavity emission~~ → Illumination & absorption → Cavity round trips → RGB top emission.
- Scope: ~~moving square packets~~ → schematic curved directional arrows, not literal ray trajectories or simulated fields; RGB buildup is spectral selection, not frequency conversion or optical gain.

### Previous versions

- Release status: ~~local-only draft; not approved for publication~~ → owner-approved public concept page, included in the sitemap and no longer marked `noindex`.
- Scientific scope: ~~no device performance is reported~~ → no device performance is reported; crosstalk suppression is a proposed function, not a simulated or measured result. The drawing and animation are unchanged.
- Site description: ~~a small optional footer-year script~~ → optional JavaScript for the footer year and interactive project schematics.
- Blackhole white light: ~~transparent rectangular wave sheets~~ → luminous curved white waves with soft edges and no pane outlines.
- Blackhole outward rays: ~~detached arrows leaving the subpixel base~~ → four connected branches growing from an elevated point on each main RGB shaft; branch growth begins only after the main shaft reaches that point. Conceptual illustration, not simulated fields.
- Blackhole illumination: ~~individual downward white arrows~~ → broad descending white wavefronts from tinted, translucent emissive layers. The wavefronts are symbolic illumination, not a claim of coherent plane-wave emission.
- Blackhole crosstalk view: ~~a single lateral leakage path~~ → smaller RGB arrows spreading outward from each subpixel and fading at the black matrix. ~~Absorbing boundaries~~ → Black matrix; external component labels are removed. These remain conceptual illustrations, not simulation results.
- Blackhole optical sequence: ~~repeating white streaks in upward RGB beams~~ → white light traveling down from tandem OLED emissive layers, RGB-selective reflection and top emission, with illustrative attenuation at absorbing boundaries. Spectral selection is not described as frequency conversion; enlarged layer spacing and animation timing are explicitly schematic.
- Blackhole presentation: ~~separate cylinder and ring–disk insets~~ → one integrated device view on a solid substrate, with a compact three-step optical legend.
- Blackhole mechanism: ~~generic OLED stack~~ → tandem white OLED, lower-mirror reflection, Fabry–Pérot cavity, and RGB top emission.
- Blackhole visual: ~~selected thin beams and boundary-directed paths~~ → substantial centered output from all 12 illustrative subpixels. Removed layer-separation control; ring and disk now share one material palette. This remains a concept, not a performance claim.

- Project Blackhole: ~~plain project title~~ → linked project detail page with an interactive concept drawing and short principles. No actual dimensions, material stack, or performance data are included.

- Project name: ~~OLED metasurface co-design~~ → Project Blackhole; description unchanged.
- Project layout: ~~two side-by-side cards~~ → two compact full-width cards stacked vertically.

- Navigation: ~~Home / Research / Publications / Notes / About~~ → Home / Research / Publications / About.
- Research: ~~Published research~~ → Ongoing projects, with two owner-supplied projects marked In progress.
- Home: ~~Featured publication and Research notes~~ → removed; paper content is collected in Publications.
- About: ~~research and technical notes~~ → research projects and publications.

### Earlier changes

- Accent palette: ~~burgundy (`#8D2638`)~~ → KAIST website blue (`#004C98`); layout and content unchanged.

- Home ~~Wavefront shaping.~~ → Seokmin Kim.
- ~~An ideal phase mask for focusing and beam steering.~~ → Metasurfaces & inverse design.
- ~~Selected work~~ → Featured publication.
- Added the supplied email, Google Scholar, and LinkedIn links; CV remains unavailable until the document is supplied.
