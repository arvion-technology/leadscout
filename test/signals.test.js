import test from "node:test";
import assert from "node:assert/strict";

import { SITES, siteById } from "../src/fixtures.js";
import {
  extractContact,
  extractFunding,
  extractHiring,
  extractIndustry,
  extractLocations,
  extractSignals,
  extractSize,
  extractTech,
  htmlToText,
  metaDescription,
  pageTitle,
  sizeBand,
} from "../src/signals.js";

const site = (id) => siteById(id);

test("htmlToText drops scripts, styles and tags", () => {
  const text = htmlToText("<style>.a{color:red}</style><p>Hello &amp; welcome</p><script>var x = 1;</script>");
  assert.equal(text, "Hello & welcome.");
  assert.doesNotMatch(text, /color|var x/);
});

test("title and meta description are extracted", () => {
  const home = site("northwind-analytics").pages[0];
  assert.match(pageTitle(home.html), /Northwind Analytics/);
  assert.match(metaDescription(home.html), /activation and retention/);
});

test("tech detection finds frameworks in scripts and copy", () => {
  const northwind = extractTech(site("northwind-analytics").pages);
  const names = northwind.map((tech) => tech.name);
  assert.ok(names.includes("React"));
  assert.ok(names.includes("Next.js"));
  assert.ok(names.includes("TypeScript"));

  const harbor = extractTech(site("harbor-logistics").pages).map((tech) => tech.name);
  assert.ok(harbor.includes("PHP"));
  assert.ok(harbor.includes("jQuery"));
  assert.ok(!harbor.includes("React"));

  const kestrel = extractTech(site("kestrel-studio").pages).map((tech) => tech.name);
  assert.ok(kestrel.includes("Webflow"));
  assert.ok(kestrel.includes("Figma"));
});

test("tech signals carry an evidence URL and quote", () => {
  for (const siteFixture of SITES) {
    for (const tech of extractTech(siteFixture.pages)) {
      assert.ok(tech.evidence.url.startsWith("https://"));
      assert.ok(tech.evidence.quote.length > 0);
    }
  }
});

test("team size is extracted with a band", () => {
  assert.deepEqual([extractSize(site("northwind-analytics").pages).value, extractSize(site("northwind-analytics").pages).band], [64, "51-200"]);
  assert.deepEqual([extractSize(site("lumen-health").pages).value, extractSize(site("lumen-health").pages).band], [140, "51-200"]);
  assert.deepEqual([extractSize(site("harbor-logistics").pages).value, extractSize(site("harbor-logistics").pages).band], [900, "201-1000"]);
  assert.deepEqual([extractSize(site("kestrel-studio").pages).value, extractSize(site("kestrel-studio").pages).band], [9, "1-10"]);
});

test("size bands cover the boundaries", () => {
  assert.equal(sizeBand(10), "1-10");
  assert.equal(sizeBand(11), "11-50");
  assert.equal(sizeBand(51), "51-200");
  assert.equal(sizeBand(201), "201-1000");
  assert.equal(sizeBand(1001), "1000+");
  assert.equal(sizeBand(null), null);
});

test("locations come from a gazetteer with a supporting sentence", () => {
  const northwind = extractLocations(site("northwind-analytics").pages).map((item) => item.city);
  assert.deepEqual(northwind.sort(), ["Berlin", "Kathmandu"]);
  const lumen = extractLocations(site("lumen-health").pages).map((item) => item.city);
  assert.ok(lumen.includes("Austin"));
  assert.ok(lumen.includes("Kathmandu"));
});

test("hiring reads roles from the careers page", () => {
  const northwind = extractHiring(site("northwind-analytics").pages);
  assert.equal(northwind.hiring, true);
  assert.equal(northwind.roles.length, 5);
  assert.equal(northwind.count, 5);
  assert.ok(northwind.roles.includes("Senior Frontend Engineer"));
  assert.match(northwind.evidence.quote, /open roles/);

  const lumen = extractHiring(site("lumen-health").pages);
  assert.equal(lumen.roles.length, 8);

  const harbor = extractHiring(site("harbor-logistics").pages);
  assert.equal(harbor.hiring, false);
  assert.deepEqual(harbor.roles, []);
});

test("funding rounds are extracted only when printed", () => {
  const northwind = extractFunding(site("northwind-analytics").pages);
  assert.equal(northwind.amountUsdM, 12);
  assert.equal(northwind.stage, "Series A");
  assert.equal(extractFunding(site("lumen-health").pages).stage, "Series B");
  assert.equal(extractFunding(site("harbor-logistics").pages).amountUsdM, null);
  assert.equal(extractFunding(site("harbor-logistics").pages).confidence, 0);
});

test("industry classification matches the four fixtures", () => {
  assert.equal(extractIndustry(site("northwind-analytics").pages).label, "analytics");
  assert.equal(extractIndustry(site("harbor-logistics").pages).label, "logistics");
  assert.equal(extractIndustry(site("lumen-health").pages).label, "healthcare");
  assert.equal(extractIndustry(site("kestrel-studio").pages).label, "design");
});

test("contact routes find mailto links and contact pages", () => {
  const northwind = extractContact(site("northwind-analytics").pages);
  assert.ok(northwind.emails.includes("hello@northwind-analytics.example"));
  const kestrel = extractContact(site("kestrel-studio").pages);
  assert.match(kestrel.contactPage, /contact$/);
  assert.ok(kestrel.phones.some((phone) => phone.includes("+351")));
});

test("extractSignals returns evidence for every site", () => {
  for (const siteFixture of SITES) {
    const signals = extractSignals(siteFixture);
    assert.equal(signals.company, siteFixture.company);
    assert.ok(signals.sources.length >= 2);
    assert.ok(signals.industry.evidence.url.startsWith("https://"));
    assert.ok(signals.size.evidence.url.startsWith("https://"));
    assert.ok(signals.industry.confidence > 0);
  }
});
