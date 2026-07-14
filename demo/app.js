// LeadScout demo — rendering only. Signals, scoring, email and crawl planning
// all come from ../src/; the demo never re-implements a rule.
import { SITES, siteById } from "../src/fixtures.js";
import { extractSignals } from "../src/signals.js";
import { DEFAULT_PROFILE, profileWithWeights, ranking, scoreLead } from "../src/score.js";
import { bodySegments, composeEmail } from "../src/email.js";
import { crawlPlan } from "../src/crawl.js";

const el = A.el;
const $ = A.$;
const $$ = A.$$;

const state = {
  signals: [],
  selectedId: "northwind-analytics",
  view: "leads",
  weights: { ...DEFAULT_PROFILE.weights },
  crawl: { depth: 2, budget: 8, agent: "ArvionScout", lead: "northwind-analytics" },
};

const currentProfile = () => profileWithWeights(state.weights);
const scoreFor = (signals) => scoreLead(signals, currentProfile());
const ranked = () => ranking(state.signals, currentProfile());
const selectedSignals = () => state.signals.find((item) => item.id === state.selectedId) || state.signals[0];

const pathOf = (url) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

const gradeEl = (grade) => el("span", { class: `grade ${grade}`, text: grade });

const confidenceChip = (value) => {
  const tone = value >= 0.85 ? "high" : value >= 0.7 ? "good" : "check";
  return el("span", { class: `badge ${tone === "high" ? "green" : tone === "good" ? "blue" : "gold"}`, text: `${Math.round(value * 100)}%` });
};

/* -------------------------------------------------------------- research */

function renderStats() {
  const rows = ranked();
  const average = rows.reduce((sum, row) => sum + row.score, 0) / (rows.length || 1);
  const hiring = state.signals.filter((signals) => signals.hiring.hiring).length;
  const stats = [
    { label: "Leads researched", value: rows.length, tone: "gold", note: "four pre-crawled sites" },
    { label: "Top score", value: rows[0]?.score ?? 0, tone: "green", note: `${rows[0]?.signals.company || "—"} at grade ${rows[0]?.grade || "–"}` },
    { label: "Hiring signals", value: hiring, tone: "", note: "sites with open roles" },
    { label: "Average fit", value: Math.round(average), tone: "", note: "at the current weights" },
  ];
  $("#lead-stats").replaceChildren(
    ...stats.map((stat) =>
      el("div", { class: "card" },
        el("div", { class: "stat" },
          el("div", { class: "stat-label", text: stat.label }),
          el("div", { class: `stat-value ${stat.tone}`, text: String(stat.value) }),
          el("div", { class: "small muted", text: stat.note }),
        ),
      ),
    ),
  );
  $("#rank-badge").textContent = `weights ${Object.entries(state.weights).map(([key, value]) => `${key} ${value}`).join(" · ")}`;
}

function renderLeadList() {
  $("#lead-list").replaceChildren(
    ...ranked().map((row) =>
      el("button", {
        class: "lead-item" + (row.signals.id === state.selectedId ? " selected" : ""),
        type: "button",
        onclick: () => selectLead(row.signals.id),
      },
        el("div", { class: "lead-row" },
          gradeEl(row.grade),
          el("span", { class: "lead-name", text: row.signals.company }),
          el("span", { class: "lead-score", text: String(row.score) }),
        ),
        el("div", { class: "lead-meta", text: `${row.signals.industry.label} · ${row.signals.size.value ?? "?"} people · ${row.signals.hiring.count || 0} roles` }),
      ),
    ),
  );
}

function evidenceBlock(evidence) {
  if (!evidence) return null;
  return el("div", { class: "evidence" },
    el("span", { class: "quote", text: `“${evidence.quote}”` }),
    el("span", { class: "src", text: `${pathOf(evidence.url)} · ${hostOf(evidence.url)}` }),
  );
}

function renderSignals(signals) {
  $("#signals-title").textContent = signals.company;
  $("#signals-sub").textContent = `${signals.domain} · ${signals.sources.length} pages crawled`;
  $("#industry-badge").textContent = signals.industry.label;
  $("#industry-badge").className = "badge gold";

  const blocks = [
    el("div", { class: "signal-block" },
      el("div", { class: "signal-head" },
        el("span", { class: "signal-label", text: "Industry" }),
        el("span", { class: "signal-value", text: signals.industry.label }),
        confidenceChip(signals.industry.confidence),
      ),
      evidenceBlock(signals.industry.evidence),
    ),
    el("div", { class: "signal-block" },
      el("div", { class: "signal-head" },
        el("span", { class: "signal-label", text: "Team size" }),
        el("span", { class: "signal-value", text: signals.size.value ? `${signals.size.value} people` : "unknown" }),
        el("span", { class: "badge", text: signals.size.band || "–" }),
        confidenceChip(signals.size.confidence),
      ),
      evidenceBlock(signals.size.evidence),
    ),
  ];

  if (signals.funding.stage || signals.funding.amountUsdM) {
    blocks.push(
      el("div", { class: "signal-block" },
        el("div", { class: "signal-head" },
          el("span", { class: "signal-label", text: "Funding" }),
          el("span", { class: "signal-value", text: `${signals.funding.stage || "round"}${signals.funding.amountUsdM ? ` · $${signals.funding.amountUsdM}M` : ""}` }),
          confidenceChip(signals.funding.confidence),
        ),
        evidenceBlock(signals.funding.evidence),
      ),
    );
  }

  blocks.push(
    el("div", { class: "signal-block" },
      el("div", { class: "signal-head" },
        el("span", { class: "signal-label", text: "Stack" }),
        el("span", { class: "signal-value", text: `${signals.tech.length} technologies` }),
      ),
      el("div", { class: "chip-row" }, ...signals.tech.map((tech) => el("span", { class: "chip", text: tech.name, title: tech.evidence.quote }))),
      evidenceBlock(signals.tech[0]?.evidence),
    ),
    el("div", { class: "signal-block" },
      el("div", { class: "signal-head" },
        el("span", { class: "signal-label", text: "Hiring" }),
        el("span", { class: "signal-value", text: signals.hiring.hiring ? `${signals.hiring.count} open role${signals.hiring.count === 1 ? "" : "s"}` : "no open roles found" }),
        signals.hiring.hiring ? el("span", { class: "badge green", text: "hiring" }) : el("span", { class: "badge", text: "quiet" }),
      ),
      signals.hiring.roles.length
        ? el("div", { class: "chip-row" }, ...signals.hiring.roles.slice(0, 6).map((role) => el("span", { class: "chip", text: role })))
        : null,
      evidenceBlock(signals.hiring.evidence),
    ),
    el("div", { class: "signal-block" },
      el("div", { class: "signal-head" },
        el("span", { class: "signal-label", text: "Locations" }),
        el("span", { class: "signal-value", text: signals.locations.length ? `${signals.locations.length} found` : "none found" }),
      ),
      el("div", { class: "chip-row" }, ...signals.locations.map((location) => el("span", { class: "chip", text: location.city, title: location.evidence.quote }))),
      evidenceBlock(signals.locations[0]?.evidence),
    ),
  );

  $("#signals").replaceChildren(...blocks);
}

function renderScore(signals, scoreResult) {
  $("#score-sub").textContent = `weighted across five factors · max ${scoreResult.max}`;
  $("#grade-badge").textContent = `grade ${scoreResult.grade}`;
  $("#grade-badge").className = `badge ${scoreResult.grade === "A" ? "green" : scoreResult.grade === "B" ? "blue" : scoreResult.grade === "C" ? "gold" : "red"}`;
  $("#score-number").textContent = String(scoreResult.score);
  $("#score-verdict").textContent = scoreResult.verdict;
  $("#score-detail").textContent = `${scoreResult.points} of ${scoreResult.max} points`;

  $("#factors").replaceChildren(
    ...scoreResult.factors.map((factor) =>
      el("div", { class: "factor" },
        el("div", { class: "factor-head" },
          el("span", { class: "factor-label", text: factor.label }),
          el("span", { class: "factor-points" }, `${factor.points}`, el("span", { class: "factor-max", text: ` / ${factor.max}` })),
        ),
        el("div", { class: "progress" }, el("i", { style: `width:${factor.max ? (factor.points / factor.max) * 100 : 0}%` })),
        el("div", { class: "factor-detail", text: factor.detail }),
      ),
    ),
  );

  $("#contact-line").textContent = signals.contact.emails[0] || signals.contact.phones[0] || "no contact found";
}

function renderLeads() {
  renderStats();
  renderLeadList();
  const signals = selectedSignals();
  renderSignals(signals);
  renderScore(signals, scoreFor(signals));
}

/* -------------------------------------------------------------- outreach */

function renderOutreach() {
  const signals = selectedSignals();
  const scoreResult = scoreFor(signals);
  const email = composeEmail(signals, scoreResult);

  const badge = $("#sendable-badge");
  badge.textContent = email.sendable ? `sendable · grade ${email.priority}` : `do not send · grade ${email.priority}`;
  badge.className = `badge ${email.sendable ? "green" : "red"}`;

  $("#email-subject").textContent = email.subject;
  $("#email-to").textContent = `to: ${signals.contact.emails[0] || "no email found"} · ${signals.company}`;

  $("#email-warning").replaceChildren(
    ...(email.sendable
      ? []
      : [el("div", { class: "warning-banner" },
          el("span", { class: "badge red", text: "not sendable" }),
          el("span", { text: email.notes.join(" ") || "This draft is below the outreach threshold." }),
        )]),
  );

  const body = el("div", {});
  for (const segment of bodySegments(email.body)) {
    if (segment.type === "citation") {
      body.append(el("span", { class: "cite", text: `[${segment.id}]`, title: "claim in the ledger" }));
    } else {
      body.append(document.createTextNode(segment.value));
    }
  }
  $("#email-body").replaceChildren(body);
  $("#email-meta").textContent = `${email.claims.length} cited claim${email.claims.length === 1 ? "" : "s"} · score ${scoreResult.score} · ${scoreResult.verdict}`;

  $("#claims").replaceChildren(
    ...(email.claims.length
      ? email.claims.map((claim) =>
          el("div", { class: "claim" },
            el("span", { class: "cite-marker", text: String(claim.id) }),
            el("div", {},
              el("div", { class: "claim-text", text: claim.text }),
              el("div", { class: "claim-quote", text: `“${claim.citation.quote}”` }),
              el("div", { class: "claim-src", text: `${pathOf(claim.citation.url)} · ${hostOf(claim.citation.url)}` }),
            ),
          ),
        )
      : [el("div", { class: "small muted", text: "No citable claim was found, so the composer says so instead of inventing one." })]),
  );

  const picker = $("#outreach-lead");
  picker.replaceChildren(
    ...state.signals.map((item) => {
      const score = scoreFor(item);
      return el("option", { value: item.id, text: `${item.company} — ${score.score} ${score.grade}` });
    }),
  );
  picker.value = signals.id;
  picker.onchange = (event) => selectLead(event.target.value);

  const summary = el("dl", { class: "kv" });
  const rows = [
    ["Industry", signals.industry.label],
    ["Team", signals.size.value ? `${signals.size.value} people` : "unknown"],
    ["Locations", signals.locations.map((location) => location.city).join(", ") || "none found"],
    ["Stack", signals.tech.slice(0, 4).map((tech) => tech.name).join(", ") || "none found"],
    ["Funding", signals.funding.stage ? `${signals.funding.stage}${signals.funding.amountUsdM ? ` $${signals.funding.amountUsdM}M` : ""}` : "not disclosed"],
    ["Contact", signals.contact.emails[0] || signals.contact.phones[0] || "none found"],
    ["Pages crawled", String(signals.sources.length)],
  ];
  for (const [key, value] of rows) {
    summary.append(el("dt", { text: key }), el("dd", { text: value }));
  }
  $("#outreach-lead-card").replaceChildren(summary);

  $("#copy-email").onclick = async () => {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(text);
      A.toast("Email copied to the clipboard", "success");
    } catch {
      A.toast("Clipboard is not available in this browser", "error");
    }
  };
}

/* --------------------------------------------------------------- scoring */

function sliderRow(key, label) {
  const output = el("span", { class: "mono", text: String(state.weights[key]) });
  return el("div", { class: "weight-row" },
    el("div", { class: "row" }, el("span", { text: label }), el("span", { class: "spacer" }), output),
    el("input", {
      type: "range",
      min: "0",
      max: "50",
      step: "5",
      value: String(state.weights[key]),
      "aria-label": label,
      oninput: (event) => {
        state.weights[key] = Number(event.target.value);
        output.textContent = event.target.value;
        renderScoring();
        renderStats();
        renderLeadList();
        renderSignals(selectedSignals());
        renderScore(selectedSignals(), scoreFor(selectedSignals()));
      },
    }),
  );
}

function renderScoring() {
  const labels = { industry: "Industry", size: "Company size", stack: "Technology", hiring: "Hiring", location: "Location" };
  $("#weight-sliders").replaceChildren(...Object.keys(labels).map((key) => sliderRow(key, labels[key])));
  const total = Object.values(state.weights).reduce((sum, value) => sum + value, 0);
  $("#weights-total").textContent = `total ${total}`;

  $("#profile-industries").textContent = DEFAULT_PROFILE.industries.join(", ");
  $("#profile-sizes").textContent = DEFAULT_PROFILE.sizes.join(", ");
  $("#profile-stacks").textContent = DEFAULT_PROFILE.stacks.join(", ");
  $("#profile-locations").textContent = DEFAULT_PROFILE.targetLocations.join(", ");

  $("#ranking-table").replaceChildren(
    A.dataTable({
      columns: [
        { key: "rank", label: "#", align: "right", render: (row) => el("span", { class: "mono muted", text: String(row.rank) }) },
        { key: "company", label: "Company", render: (row) => el("span", { class: "lead-name", text: row.company }) },
        { key: "score", label: "Score", align: "right", render: (row) => el("span", { class: "mono", text: String(row.score) }) },
        { key: "grade", label: "Grade", align: "center", render: (row) => gradeEl(row.grade) },
        { key: "top", label: "Strongest factor", render: (row) => el("span", { class: "small muted", text: row.top }) },
      ],
      rows: ranked().map((row, index) => {
        const top = [...row.factors].sort((a, b) => b.points / (b.max || 1) - a.points / (a.max || 1))[0];
        return {
          rank: index + 1,
          company: row.signals.company,
          score: row.score,
          grade: row.grade,
          top: `${top.label} (${top.points}/${top.max})`,
        };
      }),
    }),
  );
}

/* ----------------------------------------------------------------- crawl */

function renderCrawl() {
  $("#crawl-depth").value = String(state.crawl.depth);
  $("#crawl-budget").value = String(state.crawl.budget);
  $("#crawl-agent").value = state.crawl.agent;
  $("#crawl-depth-value").textContent = String(state.crawl.depth);
  $("#crawl-budget-value").textContent = String(state.crawl.budget);

  const leadPicker = $("#crawl-lead");
  leadPicker.replaceChildren(
    ...state.signals.map((signals) => el("option", { value: signals.id, text: signals.company })),
  );
  leadPicker.value = state.crawl.lead;

  const site = siteById(state.crawl.lead);
  const plan = crawlPlan(site, {
    agent: state.crawl.agent,
    maxDepth: state.crawl.depth,
    maxPages: state.crawl.budget,
  });

  $("#crawl-summary").textContent = `${plan.queue.length} allowed · ${plan.skipped.length} skipped · delay ${plan.delaySeconds}s`;
  $("#robots-domain").textContent = site.domain;
  $("#robots-text").textContent = site.robots;
  $("#crawl-notes").textContent =
    `${plan.agent} would fetch ${plan.queue.length} page(s), waiting ${plan.delaySeconds}s between requests. ` +
    `${plan.skipped.length} page(s) are skipped and each one keeps the rule or limit that skipped it.`;

  $("#crawl-table").replaceChildren(
    A.dataTable({
      columns: [
        { key: "path", label: "Path", render: (row) => el("span", { class: "mono", text: row.path }) },
        { key: "depth", label: "Depth", align: "center", render: (row) => el("span", { class: "depth-pill", text: String(row.depth) }) },
        { key: "allowed", label: "Decision", render: (row) => el("span", { class: `decision ${row.allowed ? "allowed" : "blocked"}`, text: row.allowed ? "fetch" : "skip" }) },
        { key: "reason", label: "Reason", render: (row) => el("span", { class: "small muted", text: row.reason + (row.rule ? ` (${row.rule})` : "") }) },
      ],
      rows: plan.decisions,
    }),
  );
}

/* -------------------------------------------------------------------- nav */

function selectLead(id) {
  state.selectedId = id;
  state.crawl.lead = id;
  renderLeads();
  if (state.view === "outreach") renderOutreach();
  if (state.view === "crawl") renderCrawl();
}

function show(view) {
  if (!["leads", "outreach", "scoring", "crawl"].includes(view)) view = "leads";
  state.view = view;
  $$("[data-view-panel]").forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== view; });
  $$(".nav-item[data-view]").forEach((link) => link.classList.toggle("active", link.dataset.view === view));
  if (location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
  if (view === "outreach") renderOutreach();
  if (view === "scoring") renderScoring();
  if (view === "crawl") renderCrawl();
  if (view === "leads") renderLeads();
}

function bind() {
  window.addEventListener("hashchange", () => show(location.hash.replace("#", "")));
  $$(".nav-item[data-view], [data-view-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      show(link.dataset.view || link.dataset.viewLink);
    });
  });

  $("#reset-weights").addEventListener("click", () => {
    state.weights = { ...DEFAULT_PROFILE.weights };
    renderScoring();
    renderLeads();
    A.toast("Weights reset to the default profile", "success");
  });

  $("#crawl-depth").addEventListener("input", (event) => {
    state.crawl.depth = Number(event.target.value);
    renderCrawl();
  });
  $("#crawl-budget").addEventListener("input", (event) => {
    state.crawl.budget = Number(event.target.value);
    renderCrawl();
  });
  $("#crawl-agent").addEventListener("change", (event) => {
    state.crawl.agent = event.target.value;
    renderCrawl();
  });
  $("#crawl-lead").addEventListener("change", (event) => {
    state.crawl.lead = event.target.value;
    state.selectedId = event.target.value;
    renderCrawl();
    renderLeadList();
    renderSignals(selectedSignals());
    renderScore(selectedSignals(), scoreFor(selectedSignals()));
  });
}

/* ------------------------------------------------------------------- boot */

state.signals = SITES.map(extractSignals);
bind();
renderLeads();
show(location.hash.replace("#", "") || "leads");
