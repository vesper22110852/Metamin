import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFileSync(join(root, file), "utf8");

test("Notes provides an empty writing space after the owner withdraws the draft", () => {
  const html = read("notes.html");
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0];
  assert.ok(main, "Notes needs main content");
  assert.ok(/<html lang="ko">/.test(html) || /<main[^>]*lang="ko"/.test(main)
    || (/<p[^>]*lang="ko"[^>]*>장학금/.test(main) && /<section[^>]*lang="ko"/.test(main)),
    "Korean introductory text and writing area need the appropriate language annotation");
  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, /href="assets\/notes\.css(?:\?[^"]*)?"/);
  assert.match(main, /연구와 개발 과정에서 배운 것들/);
  assert.match(main, /글 모아보기|글모아보기/);
  assert.equal((main.match(/class="note-card"/g) || []).length, 0);
  assert.match(main, /class="notes-count">0 posts</);
  assert.match(main, /notes-empty|아직 공개된 글이 없습니다/);
  assert.doesNotMatch(main, /<article\b|href="(?:\.\/)?notes\//,
    "Unpublished drafts must not appear as public article cards or links");
  assert.doesNotMatch(main, /<button\b|role="(?:button|tab)"|href="#"|data-filter|aria-pressed/,
    "Decorative topics must not masquerade as working filters");
});

test("the archived research note stays unlisted and clearly unpublished", () => {
  const archived = "notes/why-decoupling-matters.html";
  const html = read(archived);
  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, /Note not published/);
  assert.match(html, /href="\.\.\/notes\.html\?v=9" aria-current="page"/);
  assert.doesNotMatch(read("sitemap.xml"), /why-decoupling-matters/);

  const pages = [
    ...readdirSync(root).filter((file) => file.endsWith(".html")),
    ...["research", "publications", "notes"].flatMap((dir) =>
      readdirSync(join(root, dir)).filter((file) => file.endsWith(".html")).map((file) => `${dir}/${file}`)),
  ];
  for (const file of pages.filter((file) => file !== archived)) {
    assert.doesNotMatch(read(file), /href="[^"]*why-decoupling-matters\.html/,
      `${file} must not link to the unpublished archived note`);
  }
});

test("the reusable Notes authoring template is not part of the deployment allowlist", () => {
  const template = read("scripts/templates/note.html");
  assert.match(template, /name="robots" content="noindex"/);
  assert.match(template, /<article\b/);
  assert.match(template, /href="\.\.\/notes\.html\?v=9" aria-current="page"/);

  const workflow = read(".github/workflows/deploy.yml");
  const copyCommands = workflow.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^cp\s/.test(line));
  assert.equal(copyCommands.length, 2, "Keep the current explicit site-file allowlist");
  assert.ok(copyCommands.every((line) => /\s_site\/$/.test(line)), "Only the staged site should be uploaded");
  const allowedSources = new Set([
    "index.html", "research.html", "notes.html", "publications.html", "about.html", "404.html",
    "robots.txt", "sitemap.xml", ".nojekyll", "assets", "research", "publications", "notes",
  ]);
  const copiedSources = copyCommands.flatMap((line) => line.split(/\s+/).slice(1, -1).filter((token) => !token.startsWith("-")));
  assert.ok(copiedSources.every((source) => allowedSources.has(source)),
    "Do not broadly copy the workspace or include authoring templates");
  assert.doesNotMatch(read("notes.html"), /(?:href|src)="[^"]*scripts\//);
  assert.doesNotMatch(read("sitemap.xml"), /scripts\/|templates\//);
});
