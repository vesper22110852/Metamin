import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = [...readdirSync(root).filter(file => file.endsWith(".html")),
  ...["research", "publications", "notes"].flatMap(dir => readdirSync(join(root, dir)).filter(file => file.endsWith(".html")).map(file => `${dir}/${file}`))];

test("local HTML links, asset paths and fragment targets resolve", () => {
  for (const file of files) {
    const html = readFileSync(join(root, file), "utf8");
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${file} needs one h1`);
    for (const [, attribute] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|data:)/.test(attribute)) continue;
      const url = new URL(attribute, `https://test.example/Metamin/${file}`);
      const relative = decodeURIComponent(url.pathname).replace(/^\/Metamin\//, "");
      const target = resolve(root, relative || "index.html");
      // Ignore the future CV path inside the explanatory HTML comment.
      if (attribute === "assets/Metamin-CV.pdf") continue;
      assert.ok(target.startsWith(root), `${file}: escaped root ${attribute}`);
      assert.ok(existsSync(target), `${file}: missing ${attribute}`);
      if (url.hash) {
        const content = readFileSync(target, "utf8");
        assert.ok(content.includes(`id="${url.hash.slice(1)}"`), `${file}: missing anchor ${attribute}`);
      }
    }
  }
});

test("academic home uses supplied photo and contacts, with an honest CV state", () => {
  const home = readFileSync(join(root, "index.html"), "utf8");
  const about = readFileSync(join(root, "about.html"), "utf8");
  assert.match(home, /src="assets\/portrait\.jpg"/);
  assert.match(home, /alt="Portrait of Seokmin Kim"/);
  assert.match(home, /href="about\.html\?v=9#cv-heading"/);
  assert.ok(!home.includes("wave-canvas"));
  assert.ok(!home.includes("metasurface.js"));
  for (const html of [home, about]) {
    assert.match(html, /mailto:ffnvkd1221@gmail\.com/);
    assert.match(html, /https:\/\/scholar\.google\.com\/citations\?hl=en&amp;user=9jJYjVEAAAAJ/);
    assert.match(html, /https:\/\/www\.linkedin\.com\/in\/seokmin-kim-969104386\//);
    assert.ok(!html.includes("gunyeal"));
  }
  assert.match(about, /I study metasurfaces and inverse design/);
  assert.match(about, /class="cv-download"[^>]* disabled/);
  assert.match(about, /Not uploaded yet/);
});

test("all pages share five navigation items and a cache-versioned blue theme", () => {
  for (const file of files) {
    const html = readFileSync(join(root, file), "utf8");
    assert.match(html, /site\.css\?v=10/);
    const nav = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav, `${file}: missing navigation`);
    assert.deepEqual([...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(match => match[1]),
      ["Home", "Research", "Publications", "Notes", "About"], file);
    for (const [, href] of nav.matchAll(/href="([^"]+)"/g)) {
      assert.match(href, /\.html\?v=9$/, `${file}: stale navigation URL`);
    }
    const current = file.startsWith("publications/") || file === "research/polarization-decoupled-cavity.html"
      ? "publications.html" : file.startsWith("research/") ? "research.html"
        : file.startsWith("notes/") ? "notes.html" : file;
    if (["index.html", "research.html", "publications.html", "notes.html", "about.html"].includes(current)) {
      assert.match(nav, new RegExp(`href="[^"]*${current.replace(".", "\\.")}\\?v=9" aria-current="page"`), file);
      assert.equal((nav.match(/aria-current="page"/g) || []).length, 1, file);
    }
    assert.ok(!html.includes("home.css"));
  }
  const css = readFileSync(join(root, "assets/site.css"), "utf8");
  assert.match(css, /--accent: #004c98;/);
  assert.match(css, /\.site-nav a\[aria-current="page"\]\s*\{[^}]*background: var\(--accent\)/);
  assert.doesNotMatch(css, /#8d2638/i);
});

test("Research contains only the two supplied ongoing projects; papers live in Publications", () => {
  const home = readFileSync(join(root, "index.html"), "utf8");
  const research = readFileSync(join(root, "research.html"), "utf8");
  const publications = readFileSync(join(root, "publications.html"), "utf8");
  const legacy = readFileSync(join(root, "research/polarization-decoupled-cavity.html"), "utf8");
  assert.doesNotMatch(home, /Featured publication|Research notes|Journal of Optics|ae90be/);
  assert.doesNotMatch(research, /Published research|Journal of Optics|ae90be|publication-item/);
  assert.match(research, /Ongoing projects/);
  assert.match(research, /href="research\/blackhole\.html\?v=9">Project Blackhole/);
  assert.match(research, /absorber beneath an OLED and RGB metamirrors/);
  assert.match(research, /Project COSMOS/);
  assert.match(research, /Hermite–Gaussian \(HG\) modes in a cascaded system/);
  assert.equal((research.match(/class="project-card"/g) || []).length, 2);
  assert.equal((research.match(/>In progress</g) || []).length, 2);
  assert.equal((research.match(/class="project-card-heading"/g) || []).length, 2);
  const css = readFileSync(join(root, "assets/site.css"), "utf8");
  assert.match(css, /\.project-grid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(publications, /Journal of Optics/);
  assert.match(publications, /href="publications\/polarization-decoupled-cavity\.html\?v=16"/);
  assert.match(legacy, /http-equiv="refresh" content="0; url=\.\.\/publications\/polarization-decoupled-cavity\.html\?v=9"/);
  const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
  assert.doesNotMatch(sitemap, /\/notes\/why-decoupling-matters|\/research\/polarization-decoupled-cavity/);
  assert.match(sitemap, /https:\/\/vesper22110852\.github\.io\/Metamin\/notes\.html/);
  assert.match(sitemap, /https:\/\/vesper22110852\.github\.io\/Metamin\/research\/blackhole\.html/);
  assert.doesNotMatch(readFileSync(join(root, "notes.html"), "utf8"), /name="robots" content="noindex"/);
});

test("public portrait is JPEG without camera/editing metadata", () => {
  const photo = readFileSync(join(root, "assets/portrait.jpg"));
  assert.equal(photo.readUInt16BE(0), 0xffd8);
  assert.ok(!photo.includes(Buffer.from("Exif")));
  assert.ok(!photo.includes(Buffer.from("Photoshop")));
  assert.ok(photo.length < 30000);
});

test("deployment includes the visual assets but does not publish tests or authoring files", () => {
  const workflow = readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8");
  assert.match(workflow, /cp -R assets research publications notes _site\//);
  assert.match(workflow, /path: _site/);
  assert.ok(!workflow.includes("cp -R tests"));
});
