import test from "node:test";
import assert from "node:assert/strict";

import {
  crawlDelayFor,
  groupsFor,
  isAllowed,
  parseRobots,
  ruleMatches,
  sitemapUrls,
} from "../src/robots.js";

const SAMPLE = `# a comment
User-agent: *
Disallow: /admin
Disallow: /api/
Allow: /api/public
Crawl-delay: 1

User-agent: ArvionScout
Disallow: /private
Allow: /private/docs

Sitemap: https://example.test/sitemap.xml`;

test("parses groups, rules, delays and sitemaps", () => {
  const robots = parseRobots(SAMPLE);
  assert.equal(robots.groups.length, 2);
  assert.deepEqual(robots.groups[0].agents, ["*"]);
  assert.equal(robots.groups[0].crawlDelay, 1);
  assert.deepEqual(robots.groups[1].agents, ["arvionscout"]);
  assert.ok(robots.groups[0].rules.some((rule) => rule.path === "/api/"));
  assert.deepEqual(sitemapUrls(robots), ["https://example.test/sitemap.xml"]);
});

test("wildcards and end anchors match the way crawlers expect", () => {
  assert.equal(ruleMatches("/files/*.pdf", "/files/report.pdf"), true);
  assert.equal(ruleMatches("/files/*.pdf", "/files/report.pdf?download=1"), true);
  assert.equal(ruleMatches("/exact$", "/exact"), true);
  assert.equal(ruleMatches("/exact$", "/exact/more"), false);
});

test("the longest matching rule wins", () => {
  const robots = parseRobots("User-agent: *\nDisallow: /careers\nAllow: /careers/engineering");
  assert.equal(isAllowed(robots, "/careers").allowed, false);
  assert.equal(isAllowed(robots, "/careers/engineering").allowed, true);
});

test("Allow wins a tie in specificity", () => {
  const robots = parseRobots("User-agent: *\nDisallow: /docs\nAllow: /docs");
  assert.equal(isAllowed(robots, "/docs").allowed, true);
});

test("no matching rule means allowed", () => {
  const robots = parseRobots("User-agent: *\nDisallow: /admin");
  const verdict = isAllowed(robots, "/pricing");
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.rule, null);
});

test("an empty Disallow allows everything", () => {
  const robots = parseRobots("User-agent: *\nDisallow:");
  assert.equal(isAllowed(robots, "/anything").allowed, true);
  assert.equal(robots.groups[0].rules.length, 0);
});

test("an empty robots file allows everything", () => {
  const robots = parseRobots("");
  assert.equal(isAllowed(robots, "/").allowed, true);
  assert.equal(crawlDelayFor(robots), 1);
});

test("agent-specific groups win over the wildcard group", () => {
  const robots = parseRobots(SAMPLE);
  assert.equal(groupsFor(robots, "ArvionScout").length, 1);
  assert.equal(groupsFor(robots, "OtherBot").length, 1);
  assert.equal(isAllowed(robots, "/private/docs", "ArvionScout").allowed, true);
  // OtherBot falls back to the wildcard group, which says nothing about /private.
  assert.equal(isAllowed(robots, "/private/docs", "OtherBot").allowed, true);
  assert.equal(isAllowed(robots, "/private", "ArvionScout").allowed, false);
});

test("crawl delay is taken from the matching group", () => {
  const robots = parseRobots("User-agent: *\nCrawl-delay: 2\n\nUser-agent: ArvionScout\nCrawl-delay: 5");
  assert.equal(crawlDelayFor(robots, "ArvionScout"), 5);
  assert.equal(crawlDelayFor(robots, "OtherBot"), 2);
});

test("fixture robots files parse without throwing", async () => {
  const { SITES } = await import("../src/fixtures.js");
  for (const site of SITES) {
    const robots = parseRobots(site.robots);
    assert.ok(robots.groups.length >= 1, site.id);
    if (/sitemap:/i.test(site.robots)) {
      assert.ok(sitemapUrls(robots).length >= 1, site.id);
    }
  }
});
