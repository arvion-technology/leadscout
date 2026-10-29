// Explainable ICP scoring.
//
// The score is a sum of five factors, each with its own maximum. Nothing is
// hidden inside a model: for every lead the demo can show the points awarded,
// the evidence that awarded them, and the reason the factor was capped. That is
// the difference between a lead score a salesperson trusts and a number they
// ignore.

export const DEFAULT_PROFILE = {
  name: "Product engineering partner",
  industries: ["analytics", "saas", "healthcare", "fintech"],
  adjacentIndustries: { analytics: "saas", saas: "analytics", healthcare: "healthtech" },
  sizes: ["51-200", "201-1000"],
  adjacentSizes: { "11-50": "51-200", "51-200": "11-50", "201-1000": "51-200" },
  stacks: ["React", "TypeScript", "Node.js", "Next.js", "AWS", "Postgres"],
  targetLocations: ["Kathmandu", "Austin", "Berlin", "Lisbon", "London"],
  weights: { industry: 15, size: 20, stack: 25, hiring: 30, location: 10 },
};

const BAND_ORDER = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

const factor = (key, label, points, max, detail, evidence = null) => ({
  key,
  label,
  points: Math.round(points * 10) / 10,
  max,
  detail,
  evidence,
});

function industryFactor(signals, profile, weight) {
  const label = signals.industry.label;
  if (profile.industries.includes(label)) {
    return factor("industry", "Industry", weight, weight, `${label} is a target industry`, signals.industry.evidence);
  }
  const adjacent = profile.adjacentIndustries[label];
  if (adjacent && profile.industries.includes(adjacent)) {
    return factor("industry", "Industry", weight * 0.5, weight, `${label} is adjacent to ${adjacent}`, signals.industry.evidence);
  }
  return factor("industry", "Industry", 0, weight, `${label} is outside the profile`, signals.industry.evidence);
}

function sizeFactor(signals, profile, weight) {
  const band = signals.size.band;
  if (!band) return factor("size", "Company size", 0, weight, "no team size found", null);
  if (profile.sizes.includes(band)) {
    return factor("size", "Company size", weight, weight, `${band} employees is the target band`, signals.size.evidence);
  }
  const adjacent = profile.adjacentSizes[band];
  if (adjacent && profile.sizes.includes(adjacent)) {
    return factor("size", "Company size", weight * 0.5, weight, `${band} is one band away from the target`, signals.size.evidence);
  }
  return factor("size", "Company size", 0, weight, `${band} employees is outside the target bands`, signals.size.evidence);
}

function stackFactor(signals, profile, weight) {
  const matched = signals.tech.filter((tech) => profile.stacks.includes(tech.name));
  const ratio = Math.min(1, matched.length / 3);
  const evidence = matched[0] ? matched[0].evidence : null;
  return factor(
    "stack",
    "Technology fit",
    weight * ratio,
    weight,
    matched.length ? `${matched.map((tech) => tech.name).join(", ")} overlap with our stack` : "no familiar technologies detected",
    evidence,
  );
}

function hiringFactor(signals, profile, weight) {
  const { roles, count } = signals.hiring;
  if (!roles.length) return factor("hiring", "Hiring signal", 0, weight, "no open engineering or design roles", signals.hiring.evidence);
  const ratio = count >= 4 ? 1 : count >= 2 ? 0.7 : 0.4;
  return factor(
    "hiring",
    "Hiring signal",
    weight * ratio,
    weight,
    `${count} open role${count === 1 ? "" : "s"}${roles.length ? `, including ${roles.slice(0, 2).join(" and ")}` : ""}`,
    signals.hiring.evidence,
  );
}

function locationFactor(signals, profile, weight) {
  const match = signals.locations.find((location) => profile.targetLocations.includes(location.city));
  if (match) {
    return factor("location", "Location", weight, weight, `${match.city} overlaps our working hours`, match.evidence);
  }
  if (signals.locations.length) {
    return factor("location", "Location", weight * 0.3, weight, `${signals.locations[0].city} is outside the target locations`, signals.locations[0].evidence);
  }
  return factor("location", "Location", 0, weight, "no office location found", null);
}

export function scoreLead(signals, profile = DEFAULT_PROFILE) {
  const weights = { ...DEFAULT_PROFILE.weights, ...(profile.weights || {}) };
  const factors = [
    industryFactor(signals, profile, weights.industry),
    sizeFactor(signals, profile, weights.size),
    stackFactor(signals, profile, weights.stack),
    hiringFactor(signals, profile, weights.hiring),
    locationFactor(signals, profile, weights.location),
  ];
  const points = factors.reduce((sum, item) => sum + item.points, 0);
  const max = factors.reduce((sum, item) => sum + item.max, 0);
  const score = max ? Math.round((points / max) * 100) : 0;
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "D";
  const verdict =
    grade === "A" ? "strong fit, write to them this week"
      : grade === "B" ? "worth a conversation"
        : grade === "C" ? "weak fit, keep in the long list"
          : "not a fit for this offer";
  return { score, grade, verdict, points: Math.round(points * 10) / 10, max, factors };
}

/** Used by the demo's weight sliders. Re-normalises so the score stays 0-100
 *  when the maxima no longer add up to 100. */
export function profileWithWeights(weights, base = DEFAULT_PROFILE) {
  return { ...base, weights: { ...base.weights, ...weights } };
}

export function ranking(signalsList, profile = DEFAULT_PROFILE) {
  return signalsList
    .map((signals) => ({ signals, ...scoreLead(signals, profile) }))
    .sort((a, b) => b.score - a.score || a.signals.company.localeCompare(b.signals.company));
}

export function bandIndex(band) {
  return BAND_ORDER.indexOf(band);
}
