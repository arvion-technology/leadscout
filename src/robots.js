// robots.txt parsing and matching.
//
// The rules follow the widely implemented "longest match wins, Allow wins ties"
// behaviour rather than the older first-match reading. That matters: a site with
// `Disallow: /careers` and `Allow: /careers/engineering` is telling us the
// engineering roles are fine to read, and a first-match parser would refuse.

const RULE_RE = /^(allow|disallow)\s*:\s*(.*)$/i;
const AGENT_RE = /^user-agent\s*:\s*(.*)$/i;
const DELAY_RE = /^crawl-delay\s*:\s*(\d+(?:\.\d+)?)\s*$/i;
const SITEMAP_RE = /^sitemap\s*:\s*(\S+)\s*$/i;

function normalisePath(path) {
  if (!path) return "/";
  const value = path.startsWith("/") ? path : `/${path}`;
  return value;
}

/** Turn a robots path with `*` and an optional trailing `$` into a matcher. */
export function ruleMatches(pattern, path) {
  if (pattern === "") return false; // Disallow: with nothing means allow all
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  const source = anchored ? `^${escaped}$` : `^${escaped}`;
  return new RegExp(source).test(path);
}

export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let group = null;
  let lastWasAgent = false;

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    const sitemap = line.match(SITEMAP_RE);
    if (sitemap) {
      sitemaps.push(sitemap[1]);
      continue;
    }
    const agent = line.match(AGENT_RE);
    if (agent) {
      if (!group || !lastWasAgent) {
        group = { agents: [], rules: [], crawlDelay: null };
        groups.push(group);
      }
      group.agents.push(agent[1].trim().toLowerCase());
      lastWasAgent = true;
      continue;
    }
    const rule = line.match(RULE_RE);
    if (rule && group) {
      // "Disallow:" with no path is an explicit allow-all and is dropped rather
      // than stored as a rule that matches every path.
      if (rule[2].trim() === "") continue;
      group.rules.push({ type: rule[1].toLowerCase(), path: rule[2].trim() });
      lastWasAgent = false;
      continue;
    }
    const delay = line.match(DELAY_RE);
    if (delay && group) {
      group.crawlDelay = Number(delay[1]);
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

/** Select the groups that apply to an agent. Exact agent names win; otherwise
 *  the wildcard group applies, and multiple matching groups are merged. */
export function groupsFor(robots, agent = "ArvionScout") {
  const wanted = String(agent).toLowerCase();
  const exact = robots.groups.filter((group) => group.agents.includes(wanted));
  if (exact.length) return exact;
  return robots.groups.filter((group) => group.agents.includes("*"));
}

export function crawlDelayFor(robots, agent = "ArvionScout") {
  const groups = groupsFor(robots, agent);
  const delays = groups.map((group) => group.crawlDelay).filter((value) => value !== null);
  return delays.length ? Math.max(...delays) : 1;
}

/** Decide whether a path may be fetched. Returns the winning rule so the demo
 *  can explain the decision rather than just colour a row red. */
export function isAllowed(robots, path, agent = "ArvionScout") {
  const target = normalisePath(path).split("?")[0];
  const groups = groupsFor(robots, agent);
  let best = null;
  for (const group of groups) {
    for (const rule of group.rules) {
      if (!ruleMatches(rule.path, target)) continue;
      const specificity = rule.path.replace(/\$$/, "").length;
      if (
        !best ||
        specificity > best.specificity ||
        (specificity === best.specificity && rule.type === "allow" && best.type === "disallow")
      ) {
        best = { type: rule.type, path: rule.path, specificity };
      }
    }
  }
  if (!best) return { allowed: true, rule: null, reason: "no matching rule" };
  return {
    allowed: best.type === "allow",
    rule: `${best.type}: ${best.path}`,
    reason: best.type === "allow" ? "allowed by rule" : "disallowed by rule",
  };
}

export function sitemapUrls(robots) {
  return [...robots.sitemaps];
}
