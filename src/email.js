// Grounded outreach composer.
//
// Rule: every sentence about the lead is a claim with a citation, and every
// citation is a URL plus the exact sentence it came from. Sentences about us are
// allowed to be uncited, they are not facts about the lead. When the score is
// too low the composer still returns the draft, but marks it unsendable and says
// why, because a "personalised" email with nothing to cite is spam with a
// template.

const SENDER = {
  name: "Arvion Technologies",
  url: "https://arviontech.net",
  signature: ", Arvion Technologies, Kathmandu",
};

function claimText(factor, signals) {
  switch (factor.key) {
    case "hiring": {
      const roles = signals.hiring.roles;
      const lead = roles.slice(0, 2).join(" and ");
      return `you have ${signals.hiring.count || roles.length} open role${(signals.hiring.count || roles.length) === 1 ? "" : "s"}${lead ? `, including ${lead}` : ""}`;
    }
    case "stack": {
      const names = signals.tech.filter((tech) => factor.detail.includes(tech.name)).map((tech) => tech.name);
      return `your product is built on ${names.slice(0, 3).join(", ")}`;
    }
    case "size":
      return `your team is around ${signals.size.value} people`;
    case "industry":
      return `you work in ${signals.industry.label}`;
    case "location":
      return `you have a team in ${signals.locations[0].city}`;
    default:
      return "";
  }
}

function buildClaims(signals, scoreResult) {
  const factors = scoreResult.factors
    .filter((item) => item.evidence && item.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  return factors.map((item, index) => {
    const text = claimText(item, signals);
    return {
      id: index + 1,
      factor: item.key,
      text,
      points: item.points,
      citation: {
        url: item.evidence.url,
        quote: item.evidence.quote,
      },
    };
  });
}

function subjectFor(signals, claims) {
  const top = claims[0];
  if (!top) return `A quick question about ${signals.company}`;
  if (top.factor === "hiring") {
    const role = signals.hiring.roles[0];
    return role ? `Question about the ${role} role at ${signals.company}` : `Question about hiring at ${signals.company}`;
  }
  if (top.factor === "stack") {
    const tech = signals.tech[0]?.name;
    return tech ? `A note on your ${tech} stack at ${signals.company}` : `A quick question about ${signals.company}`;
  }
  if (top.factor === "size") return `A note for the ${signals.company} engineering team`;
  return `A quick question about ${signals.company}`;
}

export function composeEmail(signals, scoreResult, options = {}) {
  const sender = { ...SENDER, ...(options.sender || {}) };
  const claims = buildClaims(signals, scoreResult);
  const sentences = claims.map((claim) => `${claim.text.charAt(0).toUpperCase()}${claim.text.slice(1)} [${claim.id}].`);

  const opening = claims.length
    ? `I read through ${signals.domain} before writing.`
    : `I read through ${signals.domain} before writing, and did not find enough to make a specific point.`;
  const offer =
    "We are a product engineering studio in Kathmandu. Clients usually bring us in when they need a senior squad to ship a specific release, rather than open another five requisitions.";
  const callToAction =
    "Would a 20-minute call next week be useful? I can send a one-page technical note first so you can decide whether we are relevant.";

  const body = [
    `Hi ${signals.company} team,`,
    "",
    opening,
    "",
    ...(sentences.length ? [sentences.join(" "), ""] : []),
    offer,
    "",
    callToAction,
    "",
    sender.signature,
    sender.name,
    sender.url,
  ].join("\n");

  const sendable = scoreResult.score >= 45 && claims.length > 0;
  return {
    subject: subjectFor(signals, claims),
    body,
    claims,
    sendable,
    priority: scoreResult.grade,
    notes: sendable
      ? []
      : [
          scoreResult.score < 45 ? `Score ${scoreResult.score} is below the outreach threshold (45).` : null,
          claims.length ? null : "No citable claim was found on the crawled pages.",
        ].filter(Boolean),
    sender,
  };
}

/** Render an email body with the citation markers wrapped, for the demo. */
export function bodySegments(body) {
  const parts = [];
  let last = 0;
  for (const match of body.matchAll(/\[(\d+)\]/g)) {
    parts.push({ type: "text", value: body.slice(last, match.index) });
    parts.push({ type: "citation", id: Number(match[1]) });
    last = match.index + match[0].length;
  }
  parts.push({ type: "text", value: body.slice(last) });
  return parts;
}
