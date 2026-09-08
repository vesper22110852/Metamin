import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = [...readdirSync(root).filter(file => file.endsWith(".html")),
  ...["research", "notes"].flatMap(dir => readdirSync(join(root, dir)).filter(file => file.endsWith(".html")).map(file => `${dir}/${file}`))];

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

test("home is work-led, About contains the profile and an honest CV state", () => {
  const home = readFileSync(join(root, "index.html"), "utf8");
  const about = readFileSync(join(root, "about.html"), "utf8");
  assert.ok(!home.includes("I study"));
  assert.ok(!home.includes("About me"));
  assert.match(home, /Not RCWA \/ FDTD results/);
  assert.match(home, /<svg class="wave-fallback"/);
  assert.match(home, /class="wave-controls" hidden/);
  assert.match(about, /I study metasurfaces and inverse design/);
  assert.match(about, /class="cv-download"[^>]* disabled/);
  assert.match(about, /Not uploaded yet/);
});

test("deployment includes the visual assets but does not publish tests or authoring files", () => {
  const workflow = readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8");
  assert.match(workflow, /cp -R assets research notes _site\//);
  assert.match(workflow, /path: _site/);
  assert.ok(!workflow.includes("cp -R tests"));
});
