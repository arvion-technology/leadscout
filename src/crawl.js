// Crawl planning.
//
// A real crawler has three constraints that matter before a single byte is
// fetched: robots.txt, depth and a page budget. This module makes the plan
// explicit — every URL in the pre-crawled fixture is either allowed, skipped by
// robots, skipped by depth, or skipped by budget — so the demo can show the
// decisions instead of claiming "we respect robots".

import { crawlDelayFor, isAllowed, parseRobots } from "./robots.js";

export const DEFAULT_AGENT = "ArvionScout";

export function pathOf(url) {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

export function crawlPlan(site, options = {}) {
  const agent = options.agent || DEFAULT_AGENT;
  const maxDepth = options.maxDepth ?? 2;
  const maxPages = options.maxPages ?? 8;
  const robots = parseRobots(site.robots);
  const delay = crawlDelayFor(robots, agent);

  const decisions = site.pages.map((page) => {
    const path = pathOf(page.url);
    const verdict = isAllowed(robots, path, agent);
    let reason = verdict.reason;
    let allowed = verdict.allowed;
    if (allowed && page.depth > maxDepth) {
      allowed = false;
      reason = `depth ${page.depth} exceeds limit ${maxDepth}`;
    }
    return { url: page.url, path, depth: page.depth, allowed, reason, rule: verdict.rule };
  });

  const withinDepth = decisions.filter((item) => item.allowed).sort((a, b) => a.depth - b.depth);
  const allowed = withinDepth.slice(0, maxPages);
  const allowedUrls = new Set(allowed.map((item) => item.url));
  const skipped = decisions
    .filter((item) => !allowedUrls.has(item.url))
    .map((item) => ({
      ...item,
      reason: item.allowed ? `page budget of ${maxPages} reached` : item.reason,
      allowed: false,
    }));

  return {
    agent,
    maxDepth,
    maxPages,
    delaySeconds: delay,
    robots,
    decisions,
    queue: allowed,
    skipped,
  };
}

/** Minimal HTML link discovery, used to show how the frontier would grow. */
export function discoverLinks(html, baseUrl) {
  const links = new Set();
  for (const match of String(html || "").matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (/^(mailto:|tel:|#|javascript:)/i.test(href)) continue;
    try {
      links.add(new URL(href, baseUrl).toString());
    } catch {
      // A malformed href is not a reason to fail the crawl.
    }
  }
  return [...links];
}
