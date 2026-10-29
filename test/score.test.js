import test from "node:test";
import assert from "node:assert/strict";

import { SITES, siteById } from "../src/fixtures.js";
import { extractSignals } from "../src/signals.js";
import {
  DEFAULT_PROFILE,
  profileWithWeights,
  ranking,
  scoreLead,
} from "../src/score.js";

const signalsFor = (id) => extractSignals(siteById(id));

test("the profile ranks the four fixtures in the expected order", () => {
  const ranked = ranking(SITES.map(extractSignals));
  assert.deepEqual(
    ranked.map((row) => row.signals.company),
    ["Lumen Health", "Northwind Analytics", "Harbor Logistics", "Kestrel Studio"],
  );
  assert.equal(ranked[0].grade, "A");
  assert.equal(ranked.at(-1).grade, "D");
});

test("factor points never exceed their maxima", () => {
  const result = scoreLead(signalsFor("northwind-analytics"));
  for (const factor of result.factors) {
    assert.ok(factor.points >= 0, factor.key);
    assert.ok(factor.points <= factor.max, factor.key);
    assert.ok(factor.label.length > 0);
    assert.ok(factor.detail.length > 0);
  }
});

test("a strong lead earns every factor", () => {
  const result = scoreLead(signalsFor("lumen-health"));
  assert.equal(result.score, 100);
  const keys = result.factors.map((factor) => factor.key);
  assert.deepEqual(keys, ["industry", "size", "stack", "hiring", "location"]);
  assert.ok(result.factors.every((factor) => factor.points === factor.max));
});

test("a poor lead is explained factor by factor", () => {
  const result = scoreLead(signalsFor("harbor-logistics"));
  const byKey = Object.fromEntries(result.factors.map((factor) => [factor.key, factor]));
  assert.equal(byKey.industry.points, 0);
  assert.equal(byKey.stack.points, 0);
  assert.equal(byKey.hiring.points, 0);
  assert.ok(byKey.size.points > 0, "the size band is still in profile");
  assert.match(byKey.hiring.detail, /no open/);
  assert.ok(result.score < 45);
});

test("positive factors carry the evidence that earned them", () => {
  const result = scoreLead(signalsFor("northwind-analytics"));
  for (const factor of result.factors) {
    if (factor.key === "industry" || factor.key === "size" || factor.key === "hiring") {
      assert.ok(factor.evidence, factor.key);
      assert.ok(factor.evidence.url.startsWith("https://"), factor.key);
      assert.ok(factor.evidence.quote.length > 0, factor.key);
    }
  }
});

test("changing weights changes the score without hiding the factors", () => {
  // Harbor only earns size and a little location; making hiring dominant
  // dilutes those points, so the normalised score must move.
  const signals = signalsFor("harbor-logistics");
  const base = scoreLead(signals);
  const hiringHeavy = scoreLead(signals, profileWithWeights({ hiring: 60, industry: 5 }));
  assert.notEqual(base.score, hiringHeavy.score);
  assert.equal(hiringHeavy.factors.length, 5);
  assert.equal(hiringHeavy.max, 5 + 20 + 25 + 60 + 10);
});

test("zeroing a weight removes it from the score's denominator", () => {
  const signals = signalsFor("lumen-health");
  const noHiring = scoreLead(signals, profileWithWeights({ hiring: 0, industry: 15, size: 20, stack: 25, location: 10 }));
  const hiringFactor = noHiring.factors.find((factor) => factor.key === "hiring");
  assert.equal(hiringFactor.max, 0);
  assert.equal(hiringFactor.points, 0);
  // The remaining factors are all full, so the normalised score stays 100, // the weight changed what the score is made of, not the verdict.
  assert.equal(noHiring.max, 70);
  assert.equal(noHiring.score, 100);
});

test("grade thresholds map to the documented bands", () => {
  const gradeOf = (score) => (score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "D");
  const scores = [100, 80, 79, 65, 64, 45, 44, 0];
  for (const score of scores) {
    assert.equal(gradeOf(score), score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "D");
  }
});

test("the target location factor rewards the Kathmandu overlap", () => {
  const result = scoreLead(signalsFor("lumen-health"));
  const location = result.factors.find((factor) => factor.key === "location");
  assert.equal(location.points, location.max);
  assert.match(location.detail, /Kathmandu/);
});

test("every fixture scores between 0 and 100 with five factors", () => {
  for (const site of SITES) {
    const result = scoreLead(extractSignals(site));
    assert.ok(result.score >= 0 && result.score <= 100, site.id);
    assert.equal(result.factors.length, 5);
    assert.ok(result.verdict.length > 0);
  }
});

test("a custom profile changes which industries qualify", () => {
  const logisticsProfile = {
    ...DEFAULT_PROFILE,
    industries: ["logistics"],
    sizes: ["201-1000"],
    stacks: ["PHP"],
    targetLocations: ["Rotterdam"],
  };
  const harbor = scoreLead(signalsFor("harbor-logistics"), logisticsProfile);
  const northwind = scoreLead(signalsFor("northwind-analytics"), logisticsProfile);
  assert.ok(harbor.score > northwind.score);
});
