// Signal extraction over pre-crawled HTML.
//
// No DOM and no parser dependency: the fixtures are marketing sites, and the
// signals we care about (framework scripts, team size sentences, addresses, job
// titles) survive a tag-stripping pass. Every extracted signal carries the URL
// and the sentence it came from, because an outreach email that cannot cite its
// claim is a guess.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

export function htmlToText(html) {
  return String(html || "")
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Block endings become sentence boundaries. Without this, a page title, the
    // navigation and the first heading run together into one "sentence", and
    // the evidence quote shown to the user is unreadable.
    .replace(/<\/(p|div|h[1-6]|li|title|a|section|header|footer|tr|td|th)>/gi, ". ")
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity.slice(1, -1)] || " ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .replace(/\.\s*$/, ".")
    .trim();
}

export function pageTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]) : "";
}

export function metaDescription(html) {
  const match = String(html || "").match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return match ? htmlToText(match[1]) : "";
}

function sentenceAround(text, index, maxLength = 170) {
  if (index < 0) return "";
  const before = text.lastIndexOf(". ", index);
  const after = text.indexOf(". ", index);
  const start = before === -1 ? 0 : before + 2;
  const end = after === -1 ? Math.min(text.length, index + maxLength) : after + 1;
  return text.slice(start, end).trim().slice(0, maxLength);
}

const TECH_PATTERNS = [
  { name: "React", pattern: /\breact(?:\.production|\.development)?(?:\.min)?\.js\b|\bReact\b/ },
  { name: "Next.js", pattern: /\/_next\// },
  { name: "Vue", pattern: /\bvue(?:\.runtime|\.global)?(?:\.min)?\.js\b|\bVue\.js\b/ },
  { name: "TypeScript", pattern: /\bTypeScript\b/ },
  { name: "Node.js", pattern: /\bNode\.?js\b/ },
  { name: "Python", pattern: /\bPython\b/ },
  { name: "PHP", pattern: /\bPHP\b/ },
  { name: "jQuery", pattern: /jquery[.-]?\d/i },
  { name: "Webflow", pattern: /\bWebflow\b/ },
  { name: "Figma", pattern: /\bFigma\b/ },
  { name: "AWS", pattern: /\bAWS\b/ },
  { name: "Postgres", pattern: /\bPostgres(?:QL)?\b/ },
  { name: "Greenhouse", pattern: /greenhouse\.io/i },
  { name: "Lever", pattern: /lever\.co/i },
];

export function extractTech(pages) {
  const found = new Map();
  for (const page of pages) {
    for (const { name, pattern } of TECH_PATTERNS) {
      if (found.has(name) || !pattern.test(page.html)) continue;
      const index = page.html.search(pattern);
      const text = htmlToText(page.html);
      const textIndex = text.search(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      const raw = page.html.slice(Math.max(0, index - 40), index + 80).replace(/\s+/g, " ").trim();
      found.set(name, {
        name,
        confidence: 0.9,
        evidence: {
          url: page.url,
          quote: textIndex >= 0 ? sentenceAround(text, textIndex) : raw,
        },
      });
    }
  }
  return [...found.values()];
}

export function sizeBand(value) {
  if (value === null || value === undefined) return null;
  if (value <= 10) return "1-10";
  if (value <= 50) return "11-50";
  if (value <= 200) return "51-200";
  if (value <= 1000) return "201-1000";
  return "1000+";
}

export function extractSize(pages) {
  for (const page of pages) {
    const text = htmlToText(page.html);
    const match =
      text.match(/\b(?:team\s+of\s+)?(\d[\d,]*)\s+(?:people|employees|staff)\b/i) ||
      text.match(/\b(\d[\d,]*)-person\b/i);
    if (!match) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) continue;
    return {
      value,
      band: sizeBand(value),
      confidence: 0.9,
      evidence: { url: page.url, quote: sentenceAround(text, match.index) },
    };
  }
  return { value: null, band: null, confidence: 0, evidence: null };
}

const CITY_GAZETTEER = [
  "Berlin", "Kathmandu", "Austin", "Lisbon", "Rotterdam", "Singapore",
  "New Jersey", "London", "New York", "San Francisco", "Toronto", "Amsterdam",
  "Bristol", "Portland", "Bengaluru", "Dubai", "Sydney",
];

export function extractLocations(pages) {
  const locations = new Map();
  for (const page of pages) {
    const text = htmlToText(page.html);
    for (const city of CITY_GAZETTEER) {
      if (locations.has(city)) continue;
      const match = text.match(new RegExp(`\\b${city.replace(/ /g, "\\s+")}\\b`));
      if (!match) continue;
      locations.set(city, {
        city,
        confidence: 0.8,
        evidence: { url: page.url, quote: sentenceAround(text, match.index) },
      });
    }
  }
  return [...locations.values()];
}

const ROLE_RE = /\b(engineer|designer|developer|manager|lead|advocate|recruiter|architect|analyst|scientist|marketer|writer|success)\b/i;

export function extractHiring(pages) {
  const careerPages = pages.filter((page) => /careers?|jobs?/i.test(page.url));
  const roles = [];
  for (const page of careerPages) {
    for (const match of page.html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)) {
      const role = htmlToText(match[1]);
      if (role && ROLE_RE.test(role) && !roles.includes(role)) roles.push(role);
    }
  }
  // Prefer a page that prints "N open roles": that sentence is the best
  // evidence for the claim, even when it lives on the homepage rather than the
  // careers page.
  const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  let evidencePage = null;
  let evidenceText = "";
  let countMatch = null;
  for (const page of pages) {
    const text = htmlToText(page.html);
    const match = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+open roles?\b/i);
    if (!match) continue;
    countMatch = match;
    evidencePage = page;
    evidenceText = text;
    break;
  }
  if (!evidencePage) {
    evidencePage = careerPages[0] || null;
    evidenceText = evidencePage ? htmlToText(evidencePage.html) : "";
  }
  const hiring = roles.length > 0 || Boolean(evidencePage);
  const quoteIndex = countMatch
    ? countMatch.index
    : roles.length && evidenceText
      ? Math.max(0, evidenceText.indexOf(roles[0]))
      : 0;
  return {
    hiring,
    roles,
    count: countMatch ? (NUMBER_WORDS[countMatch[1].toLowerCase()] ?? Number(countMatch[1])) : roles.length,
    confidence: hiring ? 0.95 : 0.6,
    evidence: evidencePage ? { url: evidencePage.url, quote: sentenceAround(evidenceText, quoteIndex) } : null,
  };
}

export function extractFunding(pages) {
  for (const page of pages) {
    const text = htmlToText(page.html);
    const match = text.match(/\braised\s+(?:a\s+)?\$?([\d.]+)\s*(M|million)\b(?:\s+Series\s+([A-C]))?/i);
    if (!match) continue;
    return {
      amountUsdM: Number(match[1]),
      stage: match[3] ? `Series ${match[3].toUpperCase()}` : null,
      confidence: 0.9,
      evidence: { url: page.url, quote: sentenceAround(text, match.index) },
    };
  }
  return { amountUsdM: null, stage: null, confidence: 0, evidence: null };
}

export function extractContact(pages) {
  const emails = new Set();
  const phones = new Set();
  let contactPage = null;
  for (const page of pages) {
    for (const match of page.html.matchAll(/mailto:([^"'?\s>]+)/gi)) emails.add(match[1]);
    for (const match of htmlToText(page.html).matchAll(/\+\d{1,3}[\d\s()-]{7,}\d/g)) phones.add(match[0].trim());
    if (!contactPage && /contact/i.test(page.url)) contactPage = page.url;
  }
  const first = pages[0];
  return {
    emails: [...emails],
    phones: [...phones],
    contactPage: contactPage || (first ? first.url : null),
    confidence: emails.size || phones.size ? 0.9 : 0.3,
  };
}

const INDUSTRY_KEYWORDS = {
  analytics: ["analytics", "retention", "funnel", "product teams"],
  saas: ["saas", "b2b software", "subscription"],
  healthcare: ["healthtech", "health", "clinics", "clinical", "hipaa", "patient"],
  logistics: ["logistics", "freight", "cargo", "shipping", "customs"],
  design: ["design studio", "brand and web design", "design", "figma", "webflow"],
  fintech: ["fintech", "payments", "banking", "invoicing"],
  ecommerce: ["ecommerce", "marketplace", "shopify"],
};

export function extractIndustry(pages) {
  let best = { label: null, hits: 0, keyword: null, page: null, index: -1 };
  for (const page of pages) {
    const text = htmlToText(page.html);
    for (const [label, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
      for (const keyword of keywords) {
        const pattern = new RegExp(`\\b${keyword.replace(/ /g, "\\s+")}\\b`, "gi");
        const count = (text.match(pattern) || []).length;
        if (count > best.hits) {
          const index = text.search(pattern);
          best = { label, hits: count, keyword, page, index };
        }
      }
    }
  }
  if (!best.label) {
    return { label: "unknown", confidence: 0, evidence: null, keyword: null };
  }
  const text = htmlToText(best.page.html);
  return {
    label: best.label,
    confidence: Math.min(0.95, 0.55 + best.hits * 0.05),
    keyword: best.keyword,
    evidence: { url: best.page.url, quote: sentenceAround(text, best.index) },
  };
}

export function extractSignals(site) {
  const pages = site.pages.filter((page) => !/default|draft/i.test(page.url));
  const industry = extractIndustry(pages);
  const size = extractSize(pages);
  return {
    id: site.id,
    company: site.company,
    domain: site.domain,
    sources: pages.map((page) => ({ url: page.url, depth: page.depth, title: pageTitle(page.html) })),
    industry,
    size,
    tech: extractTech(pages),
    locations: extractLocations(pages),
    hiring: extractHiring(pages),
    funding: extractFunding(pages),
    contact: extractContact(pages),
  };
}
