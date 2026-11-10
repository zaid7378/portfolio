// ─────────────────────────────────────────────────────────────
//  Edit everything about the portfolio from this one file.
// ─────────────────────────────────────────────────────────────

export const site = {
  brand: "ZAID'S DEV",
  name: "Muhammad Zaid",
  email: "info@zaids.dev",
  phone: "+92 318 8484084",

  // Shown bottom-right as "<city> <time>". Set timeZone to an IANA
  // zone (e.g. "Asia/Karachi") to show YOUR time instead of the visitor's.
  city: "Lahore",
  timeZone: "Asia/Karachi" as string | undefined,

  // transparent, background-removed WebP (27 KB). After swapping public/portrait.png,
  // regenerate it with:  node scripts/make-portrait.mjs
  portrait: "/portrait.webp",

  // HOME BURN design: this image covers the portrait and burns away on hover to reveal `portrait`.
  // Use the same framing as portrait.png (e.g. you in the costume, same pose / crop).
  // Missing file → a generated black & white "print" of the portrait is used as the cover.
  burnCover: "/portrait-cover.webp",

  // red/blue web-slinger theme on the home page (corner webs, dangling spider, click to shoot a web)
  webTheme: true,

  particles: {
    // portrait is black & white particles; hovering it reveals the original photo
    colorOnHover: true,
    // particles scatter away from the cursor (off: the image stays still on hover)
    scatterOnHover: false,
  },

  hero: {
    outline: "MODERN",
    solid: "WEBSITES",
    tags: ["WORDPRESS", "PHP", "NEXT.JS"],
    intro:
      "I build high-performance WordPress and custom PHP websites — turning complex ideas into clean, user-friendly digital experiences that help businesses grow.",
  },

  stats: [
    { value: 250, suffix: "+", label: "PROJECTS_DELIVERED", fill: 0.92 },
    { value: 120, suffix: "+", label: "HAPPY_CLIENTS", fill: 0.85 },
  ],

  specs: [
    ["ROLE", "WEB DEVELOPER"],
    ["STACK", "WORDPRESS / PHP / NEXT.JS"],
    ["FOCUS", "SPEED / UI-UX / AUTOMATION"],
    ["EXPERIENCE", "03+ YEARS"],
    ["AVAILABILITY", "OPEN FOR WORK"],
    ["RESPONSE", "UNDER 24H"],
  ] as [string, string][],

  ticker: [
    ["AVAILABILITY", "OPEN"],
    ["LOCATION", "LAHORE, PK"],
    ["CLIENTS", "120+ HAPPY"],
    ["RETURNING", "90%"],
    ["CORE_ID", "WEB DEVELOPER"],
    ["STATUS", "HIRE ME NOW"],
  ] as [string, string][],

  // Menu links, top to bottom (numbered [5] → [2] like the reference).
  // Point href at your real pages / profiles; "#" just closes the menu.
  menu: [
    { label: "CONTACT", href: "/contact" },
    { label: "BLOG", href: "https://zaids.dev/blog/" },
    { label: "PROJECTS", href: "/projects" },
    { label: "ABOUT", href: "/about" },
  ],

  // ── PROJECTS page ───────────────────────────────────────────
  // `image`: path under /public (e.g. "/projects/dashboard.webp"). Leave "" for a generated thumbnail.
  // `href`: case study / live link. "" hides the arrow link.
  projects: [
    {
      title: "Fisio Fitio",
      category: "PHYSIOTHERAPY CLINIC",
      service: "WEB DEVELOPMENT / USER EXPERIENCE",
      year: "",
      desc: "A fully custom, responsive WordPress site for a physiotherapy clinic — with a dedicated landing page for each treatment and a clear booking path that lifted their conversion rate.",
      tags: ["WORDPRESS", "LANDING PAGES", "BOOKING"],
      image: "/projects/fisio-fitio.webp",
      href: "https://fisiofitio.com/",
    },
    {
      title: "RankSolv",
      category: "DIGITAL MARKETING AGENCY",
      service: "WEB REVAMP / UI TRANSFORMATION",
      year: "",
      desc: "Turned a basic landing page into a modern, fully responsive and speed-optimised agency site, built around lead generation with partner logos as trust signals.",
      tags: ["REVAMP", "UI / UX", "LEAD GENERATION"],
      image: "/projects/ranksolv.webp",
      href: "https://ranksolv.com/",
    },
  ],

  // ── CONTACT page ────────────────────────────────────────────
  contact: {
    kicker: "[ CONTACT_FOR_WORK ]",
    title: "LET'S TALK",
    intro:
      "Ready to start your next project? I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision. I typically respond within 24 hours.",
    types: ["BUSINESS WEBSITE", "E-COMMERCE", "WORDPRESS", "AI CHATBOT", "GHL AUTOMATION", "MAINTENANCE"],
    budgets: ["$500", "$1,200", "$2,000+"],
    maxLength: 5000,
    // Optional: a form service URL (e.g. https://formspree.io/f/xxxx) to receive messages directly.
    // Left empty, "Transmit" opens the visitor's email app with the message filled in, addressed to `email`.
    endpoint: "",
  },

  // ── ABOUT page ──────────────────────────────────────────────
  about: {
    intro: {
      kicker: "Web developer based in Lahore, Pakistan",
      title: ["HEY! I'M", "MUHAMMAD ZAID"],
      body:
        "I'm a professional web developer specialising in high-performance WordPress and custom PHP solutions. I believe design is more than visuals — it's a language that tells stories, sparks emotions and leaves a lasting impression. Since May 2023 I've been Senior Web Developer & UI Architect at DEP LLC, where I've led 150+ high-performance web applications — fully responsive across every platform — and optimised Core Web Vitals and UI workflows for a 35% lift in user retention.",
    },
    facts: [
      ["BASED", "LAHORE · PAKISTAN"],
      ["ROLE", "SENIOR WEB DEVELOPER & UI ARCHITECT"],
      ["TRACK RECORD", "250+ PROJECTS · 120+ CLIENTS"],
      ["STATUS", "OPEN TO NEW WORK"],
    ] as [string, string][],
    principles: [
      {
        title: "Perfection",
        body: "Perfection isn't just a goal; it's a standard. Every pixel aligned and every line of code optimised, from concept to launch.",
      },
      {
        title: "Innovative",
        body: "I don't just follow trends; I build them — fresh layouts, smart integrations and AI-powered features that keep you ahead.",
      },
      {
        title: "Strategic",
        body: "Every design decision is backed by data and strategy, with conversion-centric layouts built to turn visitors into clients.",
      },
      {
        title: "Speed & clean code",
        body: "Mobile-first, Core Web Vitals tuned and plugin-light — custom PHP instead of heavy add-ons, so sites stay fast and secure.",
      },
      {
        title: "Reliable support",
        body: "My work doesn't end at launch: ongoing technical support, regular updates, backups and security checks keep your site bulletproof.",
      },
    ],
    toolkit: {
      kicker: "03+ years in, working with",
      title: ["MY FAVOURITE", "TOOLS & SKILLS"],
      lead: "The stack I reach for every day to ship business sites, online stores and automations — chosen for speed, stability and how easily my clients can manage them afterwards.",
      sectors: [
        { name: "CMS & BUILDERS", tools: ["WORDPRESS", "ELEMENTOR", "WIX", "SQUARESPACE"] },
        { name: "FRONTEND", tools: ["HTML & CSS", "JAVASCRIPT", "TAILWIND CSS", "NEXT.JS", "VUE.JS"] },
        { name: "BACKEND", tools: ["PHP", "PYTHON", "CUSTOM APIS"] },
        { name: "AI & AUTOMATION", tools: ["AI CHATBOTS", "GOHIGHLEVEL (GHL)", "WORKFLOW AUTOMATION"] },
        { name: "GROWTH & CARE", tools: ["E-COMMERCE", "CORE WEB VITALS", "SEO", "MAINTENANCE"] },
      ],
      outro:
        "My process stays the same on every project: understand your goals, plan the roadmap and site structure, build a fast, secure and fully responsive site with WordPress, Elementor or PHP — then stay on for support, updates and security checks long after launch.",
    },
    next: {
      kicker: "You've got a challenge?",
      title: ["LET'S BUILD", "SOMETHING GREAT"],
      body: "Tell me about your business and your goals. A standard business site usually takes 1–2 weeks; custom e-commerce takes a little longer. I'll reply within 24 hours with an honest plan.",
      cta: "HIRE ME NOW",
    },
  },

  designs: [
    { id: "PARTICLES", label: "HOME PARTICLES" },
    { id: "CRT", label: "HOME CRT" },
    { id: "GLOBE", label: "HOME GLOBE" },
    { id: "ORBIT", label: "HOME ORBIT" },
    { id: "BURN", label: "HOME BURN" },
  ] as { id: Design; label: string }[],

  socials: [
    ["LINKEDIN", "https://pk.linkedin.com/in/muhammad-zaid-0667a6284"],
    ["FACEBOOK", "https://www.facebook.com/share/18SwCoRBQf/"],
    ["WHATSAPP", "https://wa.me/923188484084"],
    ["EMAIL", "mailto:info@zaids.dev"],
  ] as [string, string][],
};

export type Tier = "HIGH" | "MED" | "SAVER";
export type Design = "PARTICLES" | "CRT" | "GLOBE" | "ORBIT" | "BURN";
