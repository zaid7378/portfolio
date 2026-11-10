// ─────────────────────────────────────────────────────────────
//  Edit everything about the portfolio from this one file.
// ─────────────────────────────────────────────────────────────

export const site = {
  brand: "ZAID'S DEV",
  email: "info@zaids.dev",

  // Shown bottom-right as "<city> <time>". Set timeZone to an IANA
  // zone (e.g. "Asia/Karachi") to show YOUR time instead of the visitor's.
  city: "Lahore",
  timeZone: undefined as string | undefined,

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
    outline: "IMMERSIVE",
    solid: "INTERFACES",
    tags: ["WEBGL", "WORDPRESS", "MOTION"],
    intro:
      "I build hand-coded sites where motion, shaders and typography do the talking — and the page still loads fast.",
  },

  stats: [
    { value: 45, suffix: "+", label: "PROJECTS_COMPLETED", fill: 0.82 },
    { value: 10, suffix: "+", label: "EXPERIENCE_YEARS", fill: 0.9 },
  ],

  specs: [
    ["ROLE", "CREATIVE DEVELOPER"],
    ["STACK", "WORDPRESS / NEXT.JS / REACT"],
    ["FOCUS", "WEBGL / MOTION"],
    ["AVAILABILITY", "OPEN FOR WORK"],
    ["RESPONSE", "UNDER 24H"],
  ] as [string, string][],

  ticker: [
    ["AVAILABILITY", "OPEN"],
    ["RENDERING", "WEBGL / THREE.JS"],
    ["CORE_ID", "CREATIVE DEV"],
    ["LOCATION", "REMOTE / WORLDWIDE"],
    ["STATUS", "SHIPPING"],
  ] as [string, string][],

  // Menu links, top to bottom (numbered [5] → [2] like the reference).
  // Point href at your real pages / profiles; "#" just closes the menu.
  menu: [
    { label: "CONTACT", href: "/contact" },
    { label: "BLOG", href: "#" },
    { label: "PROJECTS", href: "/projects" },
    { label: "ABOUT", href: "/about" },
  ],

  // ── PROJECTS page ───────────────────────────────────────────
  // `image`: path under /public (e.g. "/projects/dashboard.webp"). Leave "" for a generated thumbnail.
  // `href`: case study / live link. "" hides the arrow link.
  projects: [
    {
      title: "Studio Portfolio",
      category: "PORTFOLIO",
      service: "DESIGN & DEVELOPMENT",
      year: "2026",
      desc: "A hand-coded portfolio for a design studio, with a WebGL hero and a CMS the team actually enjoys updating.",
      tags: ["WORDPRESS", "WEBGL"],
      image: "",
      href: "",
    },
    {
      title: "Commerce Platform",
      category: "E-COMMERCE",
      service: "DEVELOPMENT",
      year: "2025",
      desc: "A headless storefront that keeps product pages under a second on 4G and checkout on the brand's own domain.",
      tags: ["E-COMMERCE", "HEADLESS"],
      image: "",
      href: "",
    },
    {
      title: "Realtime Dashboard",
      category: "WEB APPLICATION",
      service: "DESIGN & DEVELOPMENT",
      year: "2025",
      desc: "An operations dashboard for a logistics team, built to stay readable when several hundred values change every second.",
      tags: ["WEB APP", "DATA VISUALISATION"],
      image: "",
      href: "",
    },
    {
      title: "Audio Landing Page",
      category: "MARKETING SITE",
      service: "MOTION & DEVELOPMENT",
      year: "2025",
      desc: "A launch page for an audio product where the waveform is the interface and the page responds to what is playing.",
      tags: ["LANDING PAGE", "MOTION"],
      image: "",
      href: "",
    },
    {
      title: "WebGL Product Viewer",
      category: "3D SHOWCASE",
      service: "WEBGL DEVELOPMENT",
      year: "2024",
      desc: "An embeddable 3D viewer that drops into an existing product page and loads in under a second on a phone.",
      tags: ["3D / REALTIME", "WEBGL"],
      image: "",
      href: "",
    },
    {
      title: "Design System",
      category: "INTERNAL TOOLING",
      service: "DESIGN SYSTEMS",
      year: "2024",
      desc: "Tokens, components and documentation shared by four product teams, so new screens ship consistent by default.",
      tags: ["DESIGN SYSTEM", "REACT"],
      image: "",
      href: "",
    },
  ],

  // ── CONTACT page ────────────────────────────────────────────
  contact: {
    kicker: "[ TRANSMISSION_FORM ]",
    title: "SEND A MESSAGE",
    intro:
      "Tell me about your project — what you want to build, your timeline, and anything else I should know. I usually reply within 24 hours.",
    types: ["WEBSITE", "WEB APP", "E-COMMERCE", "3D / WEBGL", "OTHER"],
    budgets: ["< $2K", "$2K – $5K", "$5K – $10K", "$10K+"],
    maxLength: 5000,
    // Optional: a form service URL (e.g. https://formspree.io/f/xxxx) to receive messages directly.
    // Left empty, "Transmit" opens the visitor's email app with the message filled in, addressed to `email`.
    endpoint: "",
  },

  // ── ABOUT page ──────────────────────────────────────────────
  about: {
    intro: {
      kicker: "Frontend engineer, working mostly in the browser",
      title: ["I BUILD THE", "FRONT OF THINGS"],
      body:
        "Interfaces, mostly. Sites and product screens that have to look considered and still hold up when a real person opens them on a three-year-old phone. I write everything by hand — no page builder, no starter theme — because the parts I did not write are the parts I cannot fix at two in the morning. This site is the honest example: a handful of templates, one stylesheet per surface, and a few hundred lines of WebGL where a photograph was not enough.",
    },
    facts: [
      ["BASED", "REMOTE · GMT+5"],
      ["DISCIPLINE", "FRONTEND & CREATIVE ENGINEERING"],
      ["EXPERIENCE", "10+ YEARS"],
      ["STATUS", "OPEN TO NEW WORK"],
    ] as [string, string][],
    principles: [
      {
        title: "Build it by hand",
        body: "A page I wrote line by line is one I can change a year later without guessing. Frameworks earn their place when they solve a problem I actually have, not because a starter template came with them.",
      },
      {
        title: "Measure, don't guess",
        body: "Every layout claim gets checked against what the browser rendered — real numbers at the widths people use. Most of the bugs I have shipped came from a screenshot that looked about right.",
      },
      {
        title: "Motion with a reason",
        body: "An animation should say where you are or what just changed. If it only says the developer knew how to animate, it comes out before launch.",
      },
      {
        title: "Fast on a real phone",
        body: "Performance budgets are set before the first commit and checked throttled, not on a fast laptop on fast wifi. A design that only works on the machine it was made on is not finished.",
      },
      {
        title: "Legible in six months",
        body: "Comments explain why, not what. Names say what the thing is. The person maintaining it is usually me, and I am not as clever as I was on the day I wrote it.",
      },
    ],
    toolkit: {
      kicker: "Ten years in, working with",
      title: ["A TOOLKIT CHOSEN", "FOR THE JOB"],
      lead: "None of this is a badge collection. These are the tools I reach for often enough to know their sharp edges — where they save a week, and where they quietly cost one.",
      sectors: [
        { name: "CORE & FRAMEWORKS", tools: ["JAVASCRIPT", "TYPESCRIPT", "REACT", "NEXT.JS", "VUE.JS"] },
        { name: "IMMERSIVE & CREATIVE", tools: ["THREE.JS", "WEBGL", "GLSL SHADERS", "GSAP", "CANVAS API"] },
        { name: "CMS & COMMERCE", tools: ["WORDPRESS", "HEADLESS CMS", "WOOCOMMERCE", "SHOPIFY"] },
        { name: "BACKEND & DATA", tools: ["PHP", "NODE.JS", "MYSQL", "REST", "GRAPHQL"] },
        { name: "TOOLING & DESIGN", tools: ["GIT", "VITE", "TAILWIND CSS", "FIGMA"] },
      ],
      outro:
        "What ties them together is the same habit: pick the smallest thing that solves the problem, understand it properly, and be ready to explain the choice to whoever inherits the codebase. Most of my work is a long collaboration rather than a launch and a handshake, so the code has to survive being read by someone who was not in the room.",
    },
    next: {
      kicker: "If you have something in mind",
      title: ["TELL ME WHAT", "IT HAS TO DO"],
      body: "A rough idea and a deadline is enough to start with. I will tell you honestly whether I am the right person for it, roughly what it would take, and what I would cut first if the budget is tight.",
      cta: "START A CONVERSATION",
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
    ["LINKEDIN", "https://linkedin.com/"],
    ["GITHUB", "https://github.com/"],
    ["UPWORK", "https://upwork.com/"],
    ["TELEGRAM", "https://t.me/"],
  ] as [string, string][],
};

export type Tier = "HIGH" | "MED" | "SAVER";
export type Design = "PARTICLES" | "CRT" | "GLOBE" | "ORBIT" | "BURN";
