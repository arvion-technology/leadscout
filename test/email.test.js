import test from "node:test";
import assert from "node:assert/strict";

import { SITES, siteById } from "../src/fixtures.js";
import { extractSignals, htmlToText } from "../src/signals.js";
import { scoreLead } from "../src/score.js";
import { bodySegments, composeEmail } from "../src/email.js";

const draftFor = (id) => {
  const signals = extractSignals(siteById(id));
  return { signals, score: scoreLead(signals), email: composeEmail(signals, scoreLead(signals)) };
};

const normalise = (value) => value.replace(/\s+/g, " ").trim();

test("claims are capped and each one is cited", () => {
  const { email } = draftFor("northwind-analytics");
  assert.ok(email.claims.length >= 2 && email.claims.length <= 3);
  for (const claim of email.claims) {
    assert.match(claim.citation.url, /^https:\/\//);
    assert.ok(claim.citation.quote.length > 0);
    assert.match(email.body, new RegExp(`\\[${claim.id}\\]`));
  }
});

test("every citation quote appears on the cited fixture page", () => {
  for (const site of SITES) {
    const signals = extractSignals(site);
    const email = composeEmail(signals, scoreLead(signals));
    for (const claim of email.claims) {
      const page = site.pages.find((candidate) => candidate.url === claim.citation.url);
      assert.ok(page, `${site.id}: missing page ${claim.citation.url}`);
      const text = htmlToText(page.html);
      assert.ok(
        normalise(text).includes(normalise(claim.citation.quote)),
        `${site.id}: quote not found: ${claim.citation.quote}`,
      );
    }
  }
});

test("markers in the body resolve to the claims", () => {
  const { email } = draftFor("lumen-health");
  const segments = bodySegments(email.body);
  const markers = segments.filter((segment) => segment.type === "citation").map((segment) => segment.id);
  assert.deepEqual(markers, email.claims.map((claim) => claim.id));
});

test("a strong lead gets a sendable draft with a specific subject", () => {
  const { email, score } = draftFor("northwind-analytics");
  assert.equal(score.grade, "A");
  assert.equal(email.sendable, true);
  assert.deepEqual(email.notes, []);
  assert.match(email.subject, /Senior Frontend Engineer/);
});

test("a weak lead is drafted but explicitly unsendable", () => {
  const { email, score } = draftFor("kestrel-studio");
  assert.equal(score.grade, "D");
  assert.equal(email.sendable, false);
  assert.ok(email.notes.some((note) => /below the outreach threshold/.test(note)));
});

test("the body states our offer without pretending it is about the lead", () => {
  const { email } = draftFor("northwind-analytics");
  assert.match(email.body, /product engineering studio in Kathmandu/);
  assert.match(email.body, /Arvion Technologies/);
});

test("a lead with no evidence yields no claims rather than invented ones", () => {
  const emptySignals = {
    ...extractSignals(siteById("kestrel-studio")),
    hiring: { hiring: false, roles: [], count: 0, confidence: 0.6, evidence: null },
    tech: [],
    locations: [],
    industry: { label: "unknown", confidence: 0, evidence: null, keyword: null },
    size: { value: null, band: null, confidence: 0, evidence: null },
  };
  const score = scoreLead(emptySignals);
  const email = composeEmail(emptySignals, score);
  assert.deepEqual(email.claims, []);
  assert.equal(email.sendable, false);
  assert.ok(email.notes.some((note) => /No citable claim/.test(note)));
  assert.doesNotMatch(email.body, /\[\d\]/);
});

test("claims choose the highest-scoring factors first", () => {
  const { signals, score, email } = draftFor("lumen-health");
  const expectedOrder = score.factors
    .filter((factor) => factor.evidence && factor.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((factor) => factor.key);
  assert.deepEqual(email.claims.map((claim) => claim.factor), expectedOrder);
  assert.ok(signals.company);
});

test("the subject falls back cleanly when there is no hiring signal", () => {
  const { email } = draftFor("harbor-logistics");
  assert.doesNotMatch(email.subject, /role at/);
  assert.match(email.subject, /Harbor Logistics/);
});
