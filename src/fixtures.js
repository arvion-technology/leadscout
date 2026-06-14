// Four pre-crawled company sites used by the demo and the tests.
//
// A live crawler would fetch these pages with rate limits and robots checks (see
// src/robots.js and src/crawl.js). Shipping the HTML means the demo runs offline
// and — more importantly — every extraction result is reproducible, which is
// what makes the scoring and the email citations testable.
//
// The companies are fictional. The markup deliberately mirrors real marketing
// sites: framework scripts in the head, an about page with a team size, a
// careers page with job titles, and addresses buried in footer text.

export const SITES = [
  {
    id: "northwind-analytics",
    company: "Northwind Analytics",
    domain: "northwind-analytics.example",
    robots: `User-agent: *
Disallow: /admin
Disallow: /api/
Allow: /careers
Crawl-delay: 1

Sitemap: https://northwind-analytics.example/sitemap.xml`,
    pages: [
      {
        url: "https://northwind-analytics.example/",
        depth: 0,
        html: `<!doctype html>
<html><head>
  <title>Northwind Analytics — product analytics for B2B SaaS</title>
  <meta name="description" content="Northwind Analytics helps B2B SaaS teams understand activation and retention without collecting personal data." />
  <meta name="generator" content="Next.js" />
  <script src="/_next/static/chunks/main.js"></script>
  <script src="https://widget.greenhouse.io/embed.js"></script>
</head><body>
  <header><a href="/about">About</a> <a href="/careers">Careers</a> <a href="/contact">Contact</a></header>
  <h1>Product analytics for B2B SaaS</h1>
  <p>Northwind Analytics is a team of 64 people building privacy-first analytics for product teams. We are headquartered in Berlin, with a small office in Kathmandu.</p>
  <p>Our stack is TypeScript, React and Node.js, running on AWS. Nearly 300 B2B SaaS companies use the product.</p>
  <section class="jobs">
    <h2>We are hiring</h2>
    <p>Five open roles across engineering and design: Senior Frontend Engineer, Product Designer, Backend Engineer, Data Engineer and Developer Advocate.</p>
    <a href="https://northwind-analytics.example/careers">See all open roles</a>
  </section>
  <footer>
    <p>Northwind Analytics GmbH, Torstrasse 14, 10119 Berlin, Germany</p>
    <p><a href="mailto:hello@northwind-analytics.example">hello@northwind-analytics.example</a></p>
  </footer>
</body></html>`,
      },
      {
        url: "https://northwind-analytics.example/about",
        depth: 1,
        html: `<!doctype html>
<html><head><title>About Northwind Analytics</title>
<meta name="description" content="The team and the story behind Northwind Analytics." /></head>
<body>
  <h1>About us</h1>
  <p>Founded in 2021, Northwind Analytics raised a $12M Series A in 2025 led by a European seed fund. The team is now 64 people across Berlin and Kathmandu.</p>
  <p>We care about data minimisation: no cross-site tracking, no PII in event payloads, and a European data region by default.</p>
  <p>Our engineering team works in TypeScript across React and Node.js, with a Python data pipeline.</p>
</body></html>`,
      },
      {
        url: "https://northwind-analytics.example/careers",
        depth: 1,
        html: `<!doctype html>
<html><head><title>Careers at Northwind Analytics</title></head>
<body>
  <h1>Open roles</h1>
  <h3>Senior Frontend Engineer</h3><p>React, TypeScript, design systems.</p>
  <h3>Product Designer</h3><p>Figma, product discovery.</p>
  <h3>Backend Engineer</h3><p>Node.js, Postgres, AWS.</p>
  <h3>Data Engineer</h3><p>Python, dbt, Snowflake.</p>
  <h3>Developer Advocate</h3><p>Content, community, conferences.</p>
  <p>We interview remotely and support relocation to Berlin.</p>
</body></html>`,
      },
      {
        url: "https://northwind-analytics.example/admin",
        depth: 1,
        html: `<html><head><title>Admin</title></head><body>Internal dashboard. Do not crawl.</body></html>`,
      },
    ],
  },
  {
    id: "harbor-logistics",
    company: "Harbor Logistics",
    domain: "harbor-logistics.example",
    robots: `User-agent: *
Disallow: /tms
Disallow: /quote
Allow: /

User-agent: Googlebot
Disallow: /tms`,
    pages: [
      {
        url: "https://harbor-logistics.example/",
        depth: 0,
        html: `<!doctype html>
<html><head>
  <title>Harbor Logistics — freight forwarding since 1987</title>
  <meta name="description" content="Ocean and air freight forwarding, customs clearance and warehousing." />
  <script src="/js/jquery-3.4.1.min.js"></script>
  <script src="/js/site.js"></script>
</head><body>
  <h1>Freight forwarding, done properly</h1>
  <p>Harbor Logistics has moved cargo for manufacturers since 1987. More than 900 employees across Rotterdam, Singapore and New Jersey.</p>
  <p>Our systems run on a custom PHP application with a Microsoft SQL Server database. We are not a software company; we move containers.</p>
  <p>Call our desk on +31 10 555 0142 or visit the quote tool.</p>
  <footer><p>Harbor Logistics B.V., Waalhaven 22, Rotterdam, Netherlands</p></footer>
</body></html>`,
      },
      {
        url: "https://harbor-logistics.example/about",
        depth: 1,
        html: `<!doctype html>
<html><head><title>About Harbor Logistics</title></head>
<body>
  <h1>About</h1>
  <p>Founded in 1987, Harbor Logistics is family owned and operates 14 offices. Around 900 employees work across freight operations, customs and warehousing.</p>
  <p>We have no plans to build in-house software; our ERP vendor handles it.</p>
  <p>Contact: <a href="mailto:ops@harbor-logistics.example">ops@harbor-logistics.example</a></p>
</body></html>`,
      },
      {
        url: "https://harbor-logistics.example/quote",
        depth: 1,
        html: `<html><head><title>Get a quote</title></head><body><p>Customer quote tool. Requires an account.</p></body></html>`,
      },
      {
        url: "https://harbor-logistics.example/tms",
        depth: 1,
        html: `<html><head><title>Customer TMS</title></head><body><p>Transport management system sign-in.</p></body></html>`,
      },
    ],
  },
  {
    id: "lumen-health",
    company: "Lumen Health",
    domain: "lumen-health.example",
    robots: `User-agent: *
Disallow: /patient-portal
Disallow: /api/v1/
Crawl-delay: 2

Sitemap: https://lumen-health.example/sitemap.xml`,
    pages: [
      {
        url: "https://lumen-health.example/",
        depth: 0,
        html: `<!doctype html>
<html><head>
  <title>Lumen Health — care coordination for clinics</title>
  <meta name="description" content="Lumen Health builds care coordination software for outpatient clinics." />
  <script src="/static/js/react.production.min.js"></script>
  <script src="/static/js/app.js"></script>
  <meta name="generator" content="React" />
</head><body>
  <h1>Care coordination for outpatient clinics</h1>
  <p>Lumen Health is a healthtech company with 140 employees, headquartered in Austin with an engineering office in Kathmandu.</p>
  <p>Our platform is built with TypeScript and React, with a Node.js API and Postgres. We run on AWS in two regions for HIPAA reasons.</p>
  <p>We raised a $24M Series B in 2026 to expand into new clinic networks.</p>
  <a href="/careers">We are hiring — 8 open roles</a>
  <p>Questions? <a href="mailto:partnerships@lumen-health.example">partnerships@lumen-health.example</a></p>
</body></html>`,
      },
      {
        url: "https://lumen-health.example/careers",
        depth: 1,
        html: `<!doctype html>
<html><head><title>Careers — Lumen Health</title></head>
<body>
  <h1>Build care coordination with us</h1>
  <p>We are hiring across product and engineering.</p>
  <h3>Staff Frontend Engineer</h3>
  <h3>Senior Product Designer</h3>
  <h3>Backend Engineer (Node.js)</h3>
  <h3>Engineering Manager</h3>
  <h3>Clinical Product Manager</h3>
  <h3>QA Engineer</h3>
  <h3>Security Engineer</h3>
  <h3>Customer Success Lead</h3>
  <p>Our Austin and Kathmandu teams work together daily.</p>
</body></html>`,
      },
      {
        url: "https://lumen-health.example/patient-portal",
        depth: 1,
        html: `<html><head><title>Patient portal</title></head><body>Sign in to view appointments.</body></html>`,
      },
    ],
  },
  {
    id: "kestrel-studio",
    company: "Kestrel Studio",
    domain: "kestrel-studio.example",
    robots: `User-agent: *
Disallow:

Sitemap: https://kestrel-studio.example/sitemap.xml`,
    pages: [
      {
        url: "https://kestrel-studio.example/",
        depth: 0,
        html: `<!doctype html>
<html><head>
  <title>Kestrel Studio — brand and web design for founders</title>
  <meta name="description" content="A small brand and web design studio for early-stage founders." />
  <meta name="generator" content="Webflow" />
  <script src="/js/webflow.js"></script>
</head><body>
  <h1>Brand and web design for founders</h1>
  <p>Kestrel Studio is a 9-person design studio in Lisbon. We design brands, marketing sites and pitch decks.</p>
  <p>Our work is built in Figma and Webflow. We do not take on engineering projects; we hand designs to your team.</p>
  <p>Selected clients include seed-stage software companies and one climate nonprofit.</p>
  <a href="/contact">Start a project</a>
  <footer><p>Rua das Flores 12, Lisbon, Portugal</p><p><a href="mailto:studio@kestrel-studio.example">studio@kestrel-studio.example</a></p></footer>
</body></html>`,
      },
      {
        url: "https://kestrel-studio.example/contact",
        depth: 1,
        html: `<!doctype html>
<html><head><title>Contact — Kestrel Studio</title></head>
<body>
  <h1>Start a project</h1>
  <p>Tell us about the work. We reply within two business days.</p>
  <p>Email <a href="mailto:studio@kestrel-studio.example">studio@kestrel-studio.example</a> or call +351 21 555 0199.</p>
  <p>We are a team of 9, based in Lisbon, working with founders across Europe.</p>
</body></html>`,
      },
    ],
  },
];

export const siteById = (id) => SITES.find((site) => site.id === id) || null;
