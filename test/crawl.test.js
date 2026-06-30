import test from "node:test";
import assert from "node:assert/strict";

import { SITES, siteById } from "../src/fixtures.js";
import { crawlPlan, discoverLinks, pathOf } from "../src/crawl.js";
import { parseRobots } from "../src/robots.js";

const site = (id) => siteById(id);

test("pathOf extracts a pathname and tolerates junk", () => {
  assert.equal(pathOf("https://example.test/careers?ref=x"), "/careers");
  assert.equal(pathOf("https://example.test"), "/");
  assert.equal(pathOf("not a url"), "not a url");
});

test("the plan separates allowed pages from robots-blocked ones", () => {
  const plan = crawlPlan(site("northwind-analytics"));
  const allowedPaths = plan.queue.map((item) => item.path).sort();
  assert.deepEqual(allowedPaths, ["/", "/about", "/careers"]);
  const admin = plan.skipped.find((item) => item.path === "/admin");
  assert.ok(admin);
  assert.match(admin.reason, /disallowed/);
});

test("agent-specific rules change the plan", () => {
  const plan = crawlPlan(site("northwind-analytics"), { agent: "Googlebot" });
  // Northwind only has a wildcard group; the plan is the same for both agents.
  assert.equal(plan.queue.length, 3);

  const harbor = crawlPlan(site("harbor-logistics"), { agent: "Googlebot" });
  const tms = harbor.skipped.find((item) => item.path === "/tms");
  assert.match(tms.reason, /disallowed/);
});

test("depth limit removes deep pages and says why", () => {
  const shallow = crawlPlan(site("northwind-analytics"), { maxDepth: 0 });
  assert.deepEqual(shallow.queue.map((item) => item.path), ["/"]);
  const about = shallow.skipped.find((item) => item.path === "/about");
  assert.match(about.reason, /depth/);
});

test("page budget truncates the queue instead of silently dropping pages", () => {
  const plan = crawlPlan(site("northwind-analytics"), { maxPages: 2 });
  assert.equal(plan.queue.length, 2);
  const dropped = plan.skipped.find((item) => item.path === "/careers");
  assert.ok(dropped);
  assert.match(dropped.reason, /page budget/);
});

test("crawl delay comes from the matching robots group", () => {
  assert.equal(crawlPlan(site("lumen-health")).delaySeconds, 2);
  assert.equal(crawlPlan(site("northwind-analytics")).delaySeconds, 1);
  assert.equal(crawlPlan(site("kestrel-studio")).delaySeconds, 1);
});

test("the plan keeps every decision for the UI to explain", () => {
  for (const siteFixture of SITES) {
    const plan = crawlPlan(siteFixture);
    assert.equal(plan.decisions.length, siteFixture.pages.length);
    for (const decision of plan.decisions) {
      assert.equal(typeof decision.allowed, "boolean");
      assert.ok(decision.reason.length > 0);
    }
    const accounted = plan.queue.length + plan.skipped.length;
    assert.equal(accounted, plan.decisions.length, siteFixture.id);
  }
});

test("discoverLinks resolves relative hrefs and drops non-http schemes", () => {
  const html = `<a href="/about">About</a><a href="careers">Jobs</a>
    <a href="mailto:hi@example.test">Mail</a><a href="#top">Top</a>
    <a href="https://other.test/x">Other</a>`;
  const links = discoverLinks(html, "https://example.test/");
  assert.deepEqual(links.sort(), ["https://example.test/about", "https://example.test/careers", "https://other.test/x"]);
});

test("plans are deterministic for the same site and options", () => {
  const first = crawlPlan(site("lumen-health"));
  const second = crawlPlan(site("lumen-health"));
  assert.deepEqual(first.queue.map((item) => item.path), second.queue.map((item) => item.path));
  assert.deepEqual(first.skipped.map((item) => item.path), second.skipped.map((item) => item.path));
});

test("a robots file with no rules still produces a usable plan", () => {
  const robots = parseRobots("");
  assert.equal(robots.groups.length, 0);
  const plan = crawlPlan({ ...site("kestrel-studio"), robots: "" });
  assert.ok(plan.queue.length >= 2);
  assert.equal(plan.delaySeconds, 1);
});
