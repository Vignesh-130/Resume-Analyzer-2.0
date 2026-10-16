require("dotenv").config({
  override: true
});

const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const cors = require("cors");
const mammoth = require("mammoth");
const Groq = require("groq-sdk");
const pdf = require("pdf-parse");

const app = express();
// Security defaults: no secrets or resume contents are logged; upload data stays in memory.
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  next();
});
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : { origin: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public", { etag: true, maxAge: "1h" }));

// Basic in-memory request throttling protects the local demo from accidental request floods.
// For multi-instance production deployments, replace this with a shared rate-limit store.
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000);
const RATE_MAX_REQUESTS = Number(process.env.RATE_MAX_REQUESTS || 60);
const requestCounts = new Map();
app.use((req, res, next) => {
  if (!req.path.startsWith("/upload")) return next();
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  let record = requestCounts.get(key);
  if (!record || now - record.startedAt >= RATE_WINDOW_MS) record = { startedAt: now, count: 0 };
  record.count += 1;
  requestCounts.set(key, record);
  if (record.count > RATE_MAX_REQUESTS) return res.status(429).json({ error: "Too many upload requests. Please wait a minute and try again." });
  if (requestCounts.size > 1000) {
    for (const [ip, item] of requestCounts) if (now - item.startedAt >= RATE_WINDOW_MS) requestCounts.delete(ip);
  }
  next();
});

// Bound simultaneous batch requests to avoid several memory-heavy batches running at once.
const MAX_ACTIVE_BATCHES = Number(process.env.MAX_ACTIVE_BATCHES || 2);
let activeBatches = 0;
function reserveBatchSlot(req, res, next) {
  if (activeBatches >= MAX_ACTIVE_BATCHES) return res.status(429).json({ error: "The screening service is busy. Please retry shortly." });
  activeBatches += 1;
  let released = false;
  const release = () => { if (!released) { released = true; activeBatches = Math.max(0, activeBatches - 1); } };
  res.once("finish", release);
  res.once("close", release);
  next();
}

const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const hasGroqKey = Boolean(process.env.GROQ_API_KEY?.startsWith("gsk_"));
const groq = hasGroqKey ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// The catalog is intentionally data-only: extending it does not require matcher changes.
const SKILL_CATALOG = {
  "Programming Languages": ["JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby", "R", "Scala", "Racket", "MATLAB", "Perl", "Bash", "PowerShell", "Dart", "Lua", "Objective-C", "Groovy", "VBA", "Solidity", "Julia", "Haskell", "F#", "COBOL", "Fortran", "Assembly", "Visual Basic", "Elixir", "Erlang", "Clojure"],
  Frontend: ["HTML", "CSS", "Sass", "Less", "Tailwind CSS", "Bootstrap", "Material UI", "Chakra UI", "React", "Angular", "Vue.js", "Svelte", "Next.js", "Nuxt.js", "Gatsby", "Redux", "Zustand", "MobX", "Webpack", "Vite", "Parcel", "jQuery", "Three.js", "D3.js", "Chart.js", "Web Components", "Progressive Web Apps", "Responsive Design", "Accessibility", "WCAG", "Figma"],
  Backend: ["Node.js", "Express.js", "NestJS", "Fastify", "Django", "Flask", "FastAPI", "Spring Boot", "Spring", "ASP.NET Core", ".NET", "Laravel", "Ruby on Rails", "Symfony", "Gin", "Fiber", "GraphQL", "REST API", "gRPC", "WebSockets", "Microservices", "Serverless", "OAuth 2.0", "OpenID Connect", "JWT", "Apache Kafka", "RabbitMQ", "Nginx", "Apache HTTP Server"],
  Databases: ["SQL", "MySQL", "PostgreSQL", "SQLite", "Oracle Database", "Microsoft SQL Server", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Firebase", "Firestore", "Neo4j", "MariaDB", "CouchDB", "InfluxDB", "Snowflake", "BigQuery", "Amazon Redshift", "Data Modeling", "Database Design", "ETL", "Data Warehousing"],
  Cloud: ["AWS", "Microsoft Azure", "Google Cloud Platform", "AWS Lambda", "Amazon EC2", "Amazon S3", "Amazon RDS", "Amazon EKS", "Azure Functions", "Azure DevOps", "Google Kubernetes Engine", "CloudFormation", "Terraform", "OpenStack", "Heroku", "Vercel", "Netlify", "DigitalOcean", "Cloud Security", "Cloud Computing"],
  DevOps: ["Docker", "Kubernetes", "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI", "Travis CI", "Ansible", "Chef", "Puppet", "Helm", "Argo CD", "Prometheus", "Grafana", "Datadog", "Splunk", "Linux", "CI/CD", "Infrastructure as Code", "Monitoring", "Logging", "Load Balancing", "SRE"],
  "AI/ML": ["Machine Learning", "Deep Learning", "Artificial Intelligence", "Natural Language Processing", "Computer Vision", "Generative AI", "Large Language Models", "MLOps", "Data Science", "Data Analysis", "Data Engineering", "TensorFlow", "PyTorch", "scikit-learn", "Keras", "Hugging Face", "OpenAI API", "LangChain", "Pandas", "NumPy", "SciPy", "Jupyter", "Apache Spark", "Hadoop", "Apache Airflow", "MLflow", "Feature Engineering", "Model Deployment", "Statistics", "A/B Testing", "Power BI", "Tableau"],
  Libraries: ["Axios", "Lodash", "RxJS", "React Query", "Socket.IO", "Mongoose", "Prisma", "Sequelize", "SQLAlchemy", "Pydantic", "Celery", "OpenCV", "Matplotlib", "Seaborn", "Plotly", "Beautiful Soup", "Scrapy", "pytest", "Jest", "Mocha", "Chai", "Cypress", "Playwright", "Selenium", "JUnit", "Mockito", "Puppeteer"],
  Frameworks: ["React Native", "Flutter", "Ionic", "Electron", "Android", "Android SDK", "iOS", "Xcode", "Unity", "Unreal Engine", "Qt", "WordPress", "Drupal", "Shopify", "Salesforce", "SAP", "ServiceNow", "SharePoint"],
  Testing: ["Unit Testing", "Integration Testing", "End-to-End Testing", "Test Automation", "TDD", "BDD", "Postman", "SoapUI", "JUnit", "TestNG", "Appium", "k6", "JMeter", "OWASP ZAP"],
  Tools: ["Git", "GitHub", "GitLab", "Bitbucket", "VS Code", "IntelliJ IDEA", "Eclipse", "PyCharm", "Jira", "Confluence", "Slack", "Notion", "Trello", "Maven", "Gradle", "npm", "Yarn", "pnpm", "Postman", "Swagger", "OpenAPI", "SonarQube", "Sentry"],
  "Operating Systems": ["Windows", "macOS", "Ubuntu", "Debian", "Red Hat Enterprise Linux", "CentOS", "Unix", "Android", "iOS"],
  Concepts: ["Data Structures", "Algorithms", "Object-Oriented Programming", "Functional Programming", "Design Patterns", "System Design", "Distributed Systems", "Agile", "Scrum", "Kanban", "SDLC", "Requirements Analysis", "Code Review", "Frontend Development", "Backend Development", "Full Stack Development", "Performance Optimization", "Scalability", "Concurrency", "Multithreading", "Caching", "Event-Driven Architecture", "Domain-Driven Design", "SOLID Principles", "Clean Architecture", "MVC", "MVVM", "API Integration", "Web Security"],
  Networking: ["TCP/IP", "HTTP", "HTTPS", "DNS", "TLS", "SSL", "VPN", "CDN", "WebSockets", "Network Security", "Firewall", "OSI Model", "IPv4", "IPv6"],
  "Cyber Security": ["Cybersecurity", "Application Security", "Penetration Testing", "Vulnerability Assessment", "OWASP", "SIEM", "Incident Response", "Identity and Access Management", "Encryption", "Cryptography", "SOC", "Threat Modeling", "Zero Trust"],
  "Soft Skills": ["Communication", "Leadership", "Teamwork", "Problem Solving", "Time Management", "Critical Thinking", "Adaptability", "Collaboration", "Project Management", "Stakeholder Management"]
};

const UI_CATEGORY = new Map();
const SKILLS = [];
for (const [category, skills] of Object.entries(SKILL_CATALOG)) {
  const outputCategory = category === "Soft Skills" ? "soft" : ["Tools", "Operating Systems", "Testing", "IDEs"].includes(category) ? "tools" : "technical";
  for (const name of skills) {
    const key = name.toLowerCase();
    if (!UI_CATEGORY.has(key)) { SKILLS.push({ name, category, outputCategory }); UI_CATEGORY.set(key, outputCategory); }
  }
}

const ALIASES = {
  HTML: ["html5"], CSS: ["css3"], JavaScript: ["javascript", "ecmascript", "es6", "es7", "es2015", "es2022"],
  "Node.js": ["nodejs", "node js"], "Express.js": ["expressjs", "express js"], "REST API": ["restful api", "restful apis", "rest apis"],
  React: ["reactjs", "react js"], "Next.js": ["nextjs", "next js"], "Vue.js": ["vuejs", "vue js"],
  Angular: ["angularjs"], PyTorch: ["py torch", "pytorch"], FastAPI: ["fast api"], GitHub: ["github"],
  "Machine Learning": ["machine-learning", "machinelearning", "ml"], "Artificial Intelligence": ["artificial intelligence", "ai"],
  "scikit-learn": ["scikit learn", "sklearn"], "Microsoft Azure": ["azure"], "Google Cloud Platform": ["google cloud", "gcp"],
  "C++": ["cpp"], "C#": ["c sharp", "csharp"], ".NET": ["dotnet", "dot net"], "Power BI": ["powerbi"],
  "React Native": ["react-native"], "Tailwind CSS": ["tailwind"], "GraphQL": ["graph ql"], "CI/CD": ["cicd", "ci cd"],
  "Object-Oriented Programming": ["oop"], "Natural Language Processing": ["nlp"], "Large Language Models": ["llm", "llms"],
  AWS: ["amazon web services"], "Amazon EC2": ["ec2"], "Amazon S3": ["s3"], "Amazon RDS": ["rds"],
  "Frontend Development": ["frontend", "front end", "front-end", "frontend components", "user interface", "user interfaces", "ui"],
  "Backend Development": ["backend", "back end", "back-end", "backend components", "server side", "server-side"],
  "Full Stack Development": ["full stack", "full-stack", "frontend and backend"],
  "Responsive Design": ["responsive ui", "responsive user interface", "responsive user interfaces", "responsive web design"],
  "API Integration": ["integrate api", "integrate apis", "api integrations", "integrate databases"],
  "Web Security": ["security", "application security", "secure web applications"],
  "Performance Optimization": ["performance", "optimize", "optimization"]
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = value => String(value || "").normalize("NFKC").toLowerCase().replace(/[‐‑–—]/g, "-").replace(/\s+/g, " ").trim();
const compact = value => normalizeText(value).replace(/[^a-z0-9+#]/g, "");
const makePattern = term => new RegExp(`(^|[^a-z0-9+#])${term.trim().split(/[\s.-]+/).filter(Boolean).map(escapeRegex).join("[\\s.-]+")}(?=([^a-z0-9+#]|$))`, "i");
const makeGlobalPattern = term => new RegExp(`(^|[^a-z0-9+#])${term.trim().split(/[\s.-]+/).filter(Boolean).map(escapeRegex).join("[\\s.-]+")}(?=([^a-z0-9+#]|$))`, "gi");

// Compile matching expressions once. Version suffixes are accepted for skills with numeric variants.
const MATCHERS = SKILLS.map(skill => {
  const terms = [skill.name, ...(ALIASES[skill.name] || [])];
  const versionable = ["HTML", "CSS", "Java", "Python", "React", "Angular", "JavaScript", "TypeScript", "Node.js"].includes(skill.name);
  const regexes = terms.map(term => versionable
    ? new RegExp(`(^|[^a-z0-9+#])${term.trim().split(/[\s.-]+/).filter(Boolean).map(escapeRegex).join("[\\s.-]+")}(?:\\s*[-.]?\\d+(?:\\.\\d+)*)?(?=([^a-z0-9+#]|$))`, "i")
    : makePattern(term));
  return { ...skill, terms, regexes, compactTerms: terms.map(compact) };
});

function findExactSkills(text) {
  const normalized = normalizeText(text);
  return MATCHERS.flatMap(matcher => matcher.regexes.some(regex => regex.test(normalized)) ? [{ ...matcher, confidence: "exact" }] : []);
}

function findFuzzySkills(text, exactNames) {
  const tokens = normalizeText(text).split(/[^a-z0-9+#]+/).filter(Boolean);
  const joined = new Set(tokens.map((_, index) => compact(tokens.slice(index, index + 4).join(" "))));
  return MATCHERS.flatMap(matcher => {
    if (exactNames.has(matcher.name)) return [];
    const likely = matcher.compactTerms.some(term => term.length >= 7 && joined.has(term));
    return likely ? [{ ...matcher, confidence: "fuzzy" }] : [];
  });
}

async function matchSkills(text) {
  const exact = findExactSkills(text);
  const exactNames = new Set(exact.map(x => x.name));
  const fuzzy = findFuzzySkills(text, exactNames);
  const merged = [...exact, ...fuzzy];
  return [...new Map(merged.map(skill => [skill.name.toLowerCase(), skill])).values()];
}

function categorise(skills) {
  return { technical: skills.filter(s => s.outputCategory === "technical").map(s => s.name), soft: skills.filter(s => s.outputCategory === "soft").map(s => s.name), tools: skills.filter(s => s.outputCategory === "tools").map(s => s.name) };
}

function detectSections(text) {
  const normalized = normalizeText(text);
  const has = terms => terms.some(term => new RegExp(`(?:^|\\n|\\s)${escapeRegex(term)}(?:\\s|:|$)`, "i").test(text)) || terms.some(term => normalized.includes(term));
  return { education: has(["education", "academic background", "qualifications"]), skills: has(["skills", "technical skills", "core competencies"]), projects: has(["projects", "personal projects", "academic projects"]), experience: has(["experience", "work experience", "employment", "internship", "professional experience"]) };
}

function analyseFormatting(text, sections) {
  const issues = [];
  const lines = String(text).split(/\r?\n/);
  const words = normalizeText(text).split(/\s+/).filter(Boolean).length;
  if (words < 180) issues.push("Resume content is too short for an ATS to assess your experience reliably.");
  for (const [section, exists] of Object.entries(sections)) if (!exists) issues.push(`Missing a clearly labelled ${section} section.`);
  if (!/\b(summary|profile|objective)\b/i.test(text)) issues.push("Consider adding a short professional summary or objective near the top.");
  if (/[★☆◆◇●▪▫✓✔✦➤➢]/u.test(text)) issues.push("Decorative symbols were detected; use simple bullets for more reliable ATS parsing.");
  if (/\[image\]|\[graphic\]|\b(image|photo|headshot)\b/i.test(text)) issues.push("Images or graphics may not be read by ATS software; keep critical details in text.");
  const tableLikeRows = lines.filter(line => /\t/.test(line) && line.split("\t").filter(Boolean).length >= 3).length;
  if (tableLikeRows >= 2) issues.push("Possible table-based layout detected; tables can change reading order in some ATS systems.");
  const longBlankRun = text.match(/(?:\r?\n\s*){5,}/g);
  if (longBlankRun?.length) issues.push("Large blank areas were detected; reduce excess spacing to keep the document compact.");
  return issues;
}

function detectContactInfo(text) {
  return {
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text),
    phone: /(?:\+?\d[\s().-]*){10,}/.test(text),
    linkedin: /linkedin\.com\/in\//i.test(text),
    github: /github\.com\//i.test(text)
  };
}

function keywordDensity(text, required) {
  const normalized = normalizeText(text);
  return Object.fromEntries(required.map(skill => {
    const terms = [skill.name, ...(ALIASES[skill.name] || [])];
    const count = terms.reduce((total, term) => total + (normalized.match(makeGlobalPattern(term)) || []).length, 0);
    return [skill.name, count];
  }));
}

// Resume-only analysis. This score must never use job description terms,
// required skills, keyword density, semantic similarity, or match ratios.
function calculateReadability({ text, file, sections, formattingIssues, contactInfo }) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean).length;
  const fileTypeScore = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.mimetype) ? 100 : 0;
  const extractionScore = text.length >= 1200 ? 100 : text.length >= 700 ? 85 : text.length >= 350 ? 65 : text.length >= 150 ? 40 : 15;
  const lengthScore = words >= 350 && words <= 1100 ? 100 : words >= 220 ? 80 : words >= 150 ? 55 : 30;
  const sectionScore = Object.values(sections).filter(Boolean).length * 25;
  const contactScore = Math.round(Object.values(contactInfo).filter(Boolean).length / Object.keys(contactInfo).length * 100);
  const formatScore = Math.max(20, 100 - formattingIssues.length * 13);
  return Math.round(Math.min(100, Math.max(0, fileTypeScore * .10 + extractionScore * .20 + lengthScore * .15 + sectionScore * .25 + contactScore * .15 + formatScore * .15)));
}

function textCoverageScore(resumeText, jobDescription) {
  const resumeTokens = new Set(normalizeText(resumeText).split(/[^a-z0-9+#]+/).filter(token => token.length >= 4));
  const jobTokens = normalizeText(jobDescription).split(/[^a-z0-9+#]+/).filter(token => token.length >= 4);
  const stopWords = new Set(["with", "that", "this", "from", "will", "your", "have", "both", "into", "their", "there", "using", "build", "maintain", "ensure", "develop", "developer", "description", "application", "applications"]);
  const uniqueJobTokens = [...new Set(jobTokens.filter(token => !stopWords.has(token)))];
  if (!uniqueJobTokens.length) return 0;
  const matched = uniqueJobTokens.filter(token => resumeTokens.has(token)).length;
  return Math.round((matched / uniqueJobTokens.length) * 100);
}

// JD-dependent analysis. This score is allowed to use job-specific skills,
// responsibilities, terminology, requirements, and optional semantic signals.
function calculateMatchScore({ resumeText, jobDescription, requiredSkills, matchedSkills }) {
  const skillScore = requiredSkills.length
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 0;
  const terminologyScore = textCoverageScore(resumeText, jobDescription);
  const requirementPresenceScore = requiredSkills.length ? 100 : Math.min(60, terminologyScore);

  return Math.round(Math.min(100, Math.max(0, skillScore * .65 + terminologyScore * .25 + requirementPresenceScore * .10)));
}

function calculateOverallScore({ readabilityScore, matchScore }) {
  return Math.round(Math.min(100, Math.max(0, readabilityScore * .35 + matchScore * .65)));
}

function buildSuggestions({ missingSkills, sections, formattingIssues, text, matchRatio }) {
  const candidates = [];
  if (missingSkills.length) candidates.push({ p: 100, text: `Tailor your Skills and experience bullets with relevant keywords you genuinely know: ${missingSkills.slice(0, 5).join(", ")}.` });
  if (!sections.experience) candidates.push({ p: 90, text: "Add an Experience section with action-led bullets that explain your contribution and result." });
  if (!sections.projects) candidates.push({ p: 85, text: "Add two or three relevant projects, including the stack, your role, and measurable outcomes." });
  if (!sections.skills) candidates.push({ p: 80, text: "Add a clearly labelled Skills section grouped by languages, frameworks, tools, and databases." });
  if (!sections.education) candidates.push({ p: 75, text: "Add an Education section with your degree, institution, and graduation details." });
  if (formattingIssues.length) candidates.push({ p: 70, text: "Simplify the flagged formatting so the resume remains easy for ATS software to parse." });
  if (normalizeText(text).split(/\s+/).length < 350) candidates.push({ p: 65, text: "Expand concise bullets with scope, technologies used, and measurable impact." });
  if (matchRatio < .5) candidates.push({ p: 60, text: "Align your summary and most relevant accomplishments with the responsibilities in this job description." });
  candidates.push({ p: 50, text: "Use numbers where possible, for example accuracy, latency, users, revenue, or delivery time, to show impact." });
  return candidates.sort((a, b) => b.p - a.p).map(x => x.text).filter((value, index, values) => values.indexOf(value) === index).slice(0, 6);
}

// Upload limits: one resume <= 5 MB; batch <= 20 files and <= 52 MB request body.
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_BATCH_FILES = 20;
const MAX_BATCH_REQUEST_BYTES = 52 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES, files: 1, fields: 10, parts: 12 },
  fileFilter: (_req, file, cb) => {
    const ext = require("path").extname(file.originalname || "").toLowerCase();
    const valid = (ext === ".pdf" && file.mimetype === "application/pdf") ||
      (ext === ".docx" && file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    cb(valid ? null : new Error("Only PDF and DOCX resume files are supported."), valid);
  }
});

const batchUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES, files: MAX_BATCH_FILES, fields: 10, parts: MAX_BATCH_FILES + 10 },
  fileFilter: (_req, file, cb) => {
    const ext = require("path").extname(file.originalname || "").toLowerCase();
    const valid = (ext === ".pdf" && file.mimetype === "application/pdf") ||
      (ext === ".docx" && file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    cb(valid ? null : new Error("Only PDF and DOCX resume files are supported."), valid);
  }
});

function validateFileSignature(file) {
  if (!ALLOWED_MIMES.has(file.mimetype)) throw new Error("Only PDF and DOCX resume files are supported.");
  const ext = require("path").extname(file.originalname || "").toLowerCase();
  if (ext === ".pdf") {
    if (file.buffer.length < 5 || file.buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("The file does not appear to be a valid PDF.");
  } else if (ext === ".docx") {
    // DOCX is a ZIP-based Office document; ZIP files begin with PK signatures.
    if (file.buffer.length < 4 || file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) throw new Error("The file does not appear to be a valid DOCX document.");
  } else {
    throw new Error("Only PDF and DOCX resume files are supported.");
  }
}

async function extractText(file) {
  validateFileSignature(file);
  if (file.mimetype === "application/pdf") return (await pdf(file.buffer)).text || "";
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return (await mammoth.extractRawText({ buffer: file.buffer })).value || "";
  throw new Error("Only PDF and DOCX resume files are supported.");
}

async function analyzeResume(file, jobDescription) {
  const text = (await extractText(file)).replace(/\u0000/g, "").trim();
  if (text.length < 20) throw new Error("Resume text could not be extracted. Use a text-based PDF or DOCX file.");
    // Resume-only path: parser output -> structure/contact/format checks -> readability score.
    // Nothing in this block may depend on the job description.
    const resumeSkills = await matchSkills(text);
    const sections = detectSections(text);
    const formattingIssues = analyseFormatting(text, sections);
    const contactInfo = detectContactInfo(text);
    const atsReadability = calculateReadability({
      text,
      file,
      sections,
      formattingIssues,
      contactInfo
    });

    // JD-dependent path: resume + JD -> required skills/terms -> match score.
    // This path can change whenever the job description changes.
    const requiredSkills = await matchSkills(jobDescription);
    const resumeNames = new Set(resumeSkills.map(skill => skill.name.toLowerCase()));
    const matchedSkills = requiredSkills.filter(skill => resumeNames.has(skill.name.toLowerCase()));
    const missingSkills = requiredSkills.filter(skill => !resumeNames.has(skill.name.toLowerCase()));
    const density = keywordDensity(text, requiredSkills);
    const matchRatio = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0;
    const score = calculateMatchScore({
      resumeText: text,
      jobDescription,
      requiredSkills,
      matchedSkills
    });
    const overallScore = calculateOverallScore({
      readabilityScore: atsReadability,
      matchScore: score
    });
    const uiSkills = categorise(resumeSkills);
    const suggestions = buildSuggestions({ missingSkills: missingSkills.map(x => x.name), sections, formattingIssues, text, matchRatio });

    // Groq is optional enrichment only; deterministic recommendations remain the primary output.
    if (groq && suggestions.length < 6) {
      try {
        const completion = await groq.chat.completions.create({ model: groqModel, messages: [{ role: "user", content: `Give one concise ATS resume improvement in plain text only. Do not use markdown, headings, numbering, or bullet symbols. Resume/job match is ${Math.round(matchRatio * 100)}%. Missing: ${missingSkills.slice(0, 5).map(x => x.name).join(", ")}.` }] });
        const extra = completion.choices?.[0]?.message?.content?.trim();
        if (extra && !suggestions.some(item => compact(item) === compact(extra))) suggestions.push(extra);
      } catch (error) { console.warn("Groq suggestion unavailable:", error.message); }
    }
    return { technical_skills: uiSkills.technical, soft_skills: uiSkills.soft, tool_skills: uiSkills.tools, file_name: file.originalname, extracted_text: text.substring(0, 2000), score: score.toFixed(2), match_score: score, overall_score: overallScore, score_breakdown: { readability_score: atsReadability, match_score: score, overall_score: overallScore, overall_weights: { readability: 0.35, match: 0.65 } }, found_skills: resumeSkills.map(x => x.name), required_skills: requiredSkills.map(x => x.name), matched_skills: matchedSkills.map(x => x.name), missing_skills: missingSkills.map(x => x.name), required_skill_categories: Object.fromEntries(requiredSkills.map(skill => [skill.name, UI_CATEGORY.get(skill.name.toLowerCase()) || "technical"])), formatting_issues: formattingIssues, keyword_density: density, resume_sections: sections, contact_info: contactInfo, suggestions: suggestions.slice(0, 6), ats_readability: atsReadability };
  }

// Career guidance uses only skill gaps and job text, not the full resume or personal data.
const GUIDANCE_LANGUAGES = new Set(["en", "te", "hi"]);
const LANGUAGE_NAMES = { en: "English", te: "Telugu", hi: "Hindi" };
app.post("/career-guidance", async (req, res) => {
  const { missingSkills = [], matchedSkills = [], jobDescription = "", language = "en", matchScore = 0 } = req.body || {};
  if (!GUIDANCE_LANGUAGES.has(language)) return res.status(400).json({ error: "Choose English, Telugu, or Hindi." });
  if (!Array.isArray(missingSkills) || !Array.isArray(matchedSkills) || missingSkills.length > 100 || matchedSkills.length > 100) return res.status(400).json({ error: "Invalid skill lists." });
  const missing = missingSkills.map(x => String(x).slice(0, 80)).slice(0, 30);
  const matched = matchedSkills.map(x => String(x).slice(0, 80)).slice(0, 30);
  const safeJobDescription = String(jobDescription).slice(0, 5000);
  const fallback = {
    en: { suitability: `The candidate has a ${Math.round(Number(matchScore) || 0)}% job-match score based on the current keyword/skill matching rules. ${matched.length} required skill(s) were detected and ${missing.length} required skill(s) were not detected. This is a screening aid, not a hiring decision. Review project evidence and interview performance.`, roadmap: [ `Priority 1 (week 1): Review fundamentals for ${missing.slice(0, 2).join(", ") || "the role's core requirements"}.`, `Priority 2 (weeks 2–3): Complete small practical exercises using ${missing.slice(0, 3).join(", ") || "the required technologies"}.`, "Priority 3 (week 4): Build one role-relevant project, add tests, and document the work in a portfolio." ], courses: missing.length ? missing.slice(0, 5).map(skill => ({ topic: skill, recommendation: `Choose a beginner-to-intermediate course with hands-on exercises for ${skill}; compare syllabus, update date, and reviews before enrolling.` })) : [{ topic: "Role-specific project practice", recommendation: "Choose a practical project course aligned with the job description and demonstrate your work in a portfolio." }] },
    te: { suitability: `ప్రస్తుత నైపుణ్యాల సరిపోలిక నియమాల ప్రకారం జాబ్ మ్యాచ్ స్కోర్ ${Math.round(Number(matchScore) || 0)}%. ${matched.length} అవసరమైన నైపుణ్యాలు గుర్తించబడ్డాయి; ${missing.length} నైపుణ్యాలు గుర్తించబడలేదు. ఇది సహాయక స్క్రీనింగ్ మాత్రమే; తుది నియామక నిర్ణయం కాదు. ప్రాజెక్టులు, ఇంటర్వ్యూ పనితీరును కూడా పరిశీలించండి.`, roadmap: [`దశ 1 (వారం 1): ${missing.slice(0, 2).join(", ") || "ఉద్యోగానికి అవసరమైన ప్రధాన నైపుణ్యాల"} ప్రాథమికాలను అభ్యసించండి.`, `దశ 2 (2–3 వారాలు): ${missing.slice(0, 3).join(", ") || "అవసరమైన సాంకేతికతల"}పై చిన్న ప్రాక్టికల్ వ్యాయామాలు చేయండి.`, "దశ 3 (వారం 4): ఉద్యోగానికి సంబంధించిన ప్రాజెక్ట్ నిర్మించి, పరీక్షలు మరియు డాక్యుమెంటేషన్ జోడించండి."], courses: (missing.length ? missing.slice(0,5) : ["Role-specific project practice"]).map(topic => ({ topic, recommendation: `${topic} కోసం ప్రాక్టికల్ వ్యాయామాలు ఉన్న కోర్సును ఎంచుకోండి; సిలబస్, తాజాదనం, సమీక్షలను పరిశీలించండి.` })) },
    hi: { suitability: `वर्तमान कौशल-मिलान नियमों के अनुसार जॉब मैच स्कोर ${Math.round(Number(matchScore) || 0)}% है। ${matched.length} आवश्यक कौशल मिले और ${missing.length} कौशल नहीं मिले। यह केवल स्क्रीनिंग सहायता है, अंतिम भर्ती निर्णय नहीं। प्रोजेक्ट और इंटरव्यू प्रदर्शन भी जाँचें।`, roadmap: [`चरण 1 (सप्ताह 1): ${missing.slice(0,2).join(", ") || "भूमिका के मुख्य कौशल"} की बुनियाद दोहराएँ।`, `चरण 2 (सप्ताह 2–3): ${missing.slice(0,3).join(", ") || "आवश्यक तकनीकों"} पर छोटे व्यावहारिक अभ्यास करें।`, "चरण 3 (सप्ताह 4): भूमिका से जुड़ा प्रोजेक्ट बनाएँ, टेस्ट जोड़ें और पोर्टफोलियो में दस्तावेज़ रखें."], courses: (missing.length ? missing.slice(0,5) : ["Role-specific project practice"]).map(topic => ({ topic, recommendation: `${topic} के लिए अभ्यास-आधारित कोर्स चुनें; पाठ्यक्रम, अपडेट की तारीख और समीक्षाएँ जाँचें।` })) }
  };
  let guidance = fallback[language];
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({ model: groqModel, temperature: 0.2, messages: [
        { role: "system", content: `You are a cautious career-learning assistant. Respond in ${LANGUAGE_NAMES[language]}. Return only valid JSON with keys suitability (string), roadmap (array of 3 concise strings), courses (array of objects with topic and recommendation). Give course topic suggestions, not invented course URLs or guaranteed job outcomes. Explain suitability only from supplied skills and score. Do not infer protected traits. State that human review is needed.` },
        { role: "user", content: JSON.stringify({ matchScore: Math.round(Number(matchScore) || 0), matchedSkills: matched, missingSkills: missing, jobDescription: safeJobDescription }) }
      ] });
      const raw = completion.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
      if (typeof parsed.suitability === "string" && Array.isArray(parsed.roadmap) && Array.isArray(parsed.courses)) guidance = { suitability: parsed.suitability.slice(0, 2500), roadmap: parsed.roadmap.slice(0, 5).map(x => String(x).slice(0, 500)), courses: parsed.courses.slice(0, 8).map(x => ({ topic: String(x.topic || "Learning topic").slice(0, 100), recommendation: String(x.recommendation || "Choose a practical course.").slice(0, 500) })) };
    } catch (error) { console.warn("Career guidance AI unavailable; using deterministic fallback:", error.message); }
  }
  return res.json({ ...guidance, source: groq ? "ai_or_fallback" : "rule_based_fallback", language });
});

app.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a PDF or DOCX resume." });
    const jobDescription = String(req.body.jobDescription || "").trim();
    if (!jobDescription) return res.status(400).json({ error: "Job description is required." });
    if (jobDescription.length > 20000) return res.status(400).json({ error: "Job description must be 20,000 characters or fewer." });
    const result = await analyzeResume(req.file, jobDescription);
    return res.json(result);
  } catch (error) {
    console.error("Single resume analysis failed:", error.name || "Error");
    const status = /too large/i.test(error.message) ? 413 : /could not be extracted|valid PDF|valid DOCX|supported/i.test(error.message) ? 400 : 500;
    return res.status(status).json({ error: status === 500 ? "Unable to analyze this resume. Please try another text-based PDF or DOCX file." : error.message });
  }
});

app.post("/upload-batch", reserveBatchSlot, (req, res, next) => {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_BATCH_REQUEST_BYTES) return res.status(413).json({ error: "Batch request is too large. Maximum total request size is 52 MB." });
  next();
}, batchUpload.array("resumes", MAX_BATCH_FILES), async (req, res) => {
  const jobDescription = String(req.body.jobDescription || "").trim();
  if (!jobDescription) return res.status(400).json({ error: "Job description is required." });
  if (jobDescription.length > 20000) return res.status(400).json({ error: "Job description must be 20,000 characters or fewer." });
  if (!req.files?.length) return res.status(400).json({ error: "Upload at least one PDF or DOCX resume." });
  const totalBytes = req.files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_BATCH_REQUEST_BYTES) return res.status(413).json({ error: "Batch upload exceeds the 52 MB total file-size limit." });

  const shortlistCount = Number.parseInt(req.body.shortlistCount, 10);
  const minMatchScore = Number(req.body.minMatchScore ?? 50);
  const minMatchedSkills = Number.parseInt(req.body.minMatchedSkills ?? 0, 10);
  if (!Number.isInteger(shortlistCount) || shortlistCount < 1 || shortlistCount > req.files.length) {
    return res.status(400).json({ error: `Number to select must be between 1 and the ${req.files.length} uploaded resumes.` });
  }
  if (!Number.isFinite(minMatchScore) || minMatchScore < 0 || minMatchScore > 100) {
    return res.status(400).json({ error: "Minimum job-match score must be between 0 and 100." });
  }
  if (!Number.isInteger(minMatchedSkills) || minMatchedSkills < 0 || minMatchedSkills > 50) {
    return res.status(400).json({ error: "Minimum matched skills must be a whole number from 0 to 50." });
  }

  const seenHashes = new Set();
  const results = [];
  // Process sequentially to avoid loading many document parsers / optional AI calls at once.
  for (const file of req.files) {
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
    if (seenHashes.has(hash)) {
      results.push({ file_name: file.originalname, status: "duplicate", error: "Duplicate file content; this resume was not analyzed." });
      continue;
    }
    seenHashes.add(hash);
    try {
      const analysis = await analyzeResume(file, jobDescription);
      results.push({ file_name: file.originalname, status: "success", ...analysis });
    } catch (error) {
      // Return a generic error to clients; avoid leaking parser internals or file contents.
      results.push({ file_name: file.originalname, status: "failed", error: "Unable to parse or analyze this file. Check that it is a valid text-based PDF or DOCX." });
    }
  }
  const successful = results.filter(item => item.status === "success");
  successful.sort((a, b) => Number(b.match_score) - Number(a.match_score) || String(a.file_name).localeCompare(String(b.file_name)));
  successful.forEach((item, index) => { item.rank = index + 1; });
  const eligible = successful.filter(item => Number(item.match_score) >= minMatchScore && (item.matched_skills || []).length >= minMatchedSkills);
  const selectedSet = new Set(eligible.slice(0, shortlistCount));
  for (const item of successful) {
    const score = Number(item.match_score) || 0;
    const matchedCount = (item.matched_skills || []).length;
    item.screening_status = score < minMatchScore || matchedCount < minMatchedSkills
      ? "low_match"
      : selectedSet.has(item) ? "selected" : "eligible_not_selected";
    item.selection_explanation = item.screening_status === "selected"
      ? `Meets the configured eligibility rules (match score ≥ ${minMatchScore}% and ${matchedCount} matched skill(s)); ranked within the top ${shortlistCount} eligible candidate(s).`
      : item.screening_status === "eligible_not_selected"
        ? `Meets the eligibility rules but ranked outside the top ${shortlistCount} eligible candidate(s). Match score: ${score}%; matched skills: ${matchedCount}.`
        : `Did not meet the configured eligibility threshold: ${score}% match score (minimum ${minMatchScore}%) and ${matchedCount} matched skill(s) (minimum ${minMatchedSkills}).`;
  }
  for (const item of results.filter(item => item.status !== "success")) {
    item.screening_status = "failed";
    item.selection_explanation = item.status === "duplicate" ? "Duplicate file content; not analyzed." : `Processing failed: ${item.error || "unknown error"}`;
  }
  return res.json({
    total_uploaded: req.files.length,
    total_bytes: totalBytes,
    successful: successful.length,
    selected: successful.filter(item => item.screening_status === "selected").length,
    eligible_not_selected: successful.filter(item => item.screening_status === "eligible_not_selected").length,
    low_match: successful.filter(item => item.screening_status === "low_match").length,
    failed: results.filter(item => item.screening_status === "failed").length,
    duplicates: results.filter(item => item.status === "duplicate").length,
    criteria: { shortlist_count: shortlistCount, min_match_score: minMatchScore, min_matched_skills: minMatchedSkills },
    results: results.sort((a, b) => {
      const aRank = a.status === "success" ? a.rank : Number.MAX_SAFE_INTEGER;
      const bRank = b.status === "success" ? b.rank : Number.MAX_SAFE_INTEGER;
      return aRank - bRank || a.file_name.localeCompare(b.file_name);
    })
  });
});

app.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "A resume exceeds the 5 MB per-file limit." });
  if (err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_PART_COUNT") return res.status(413).json({ error: `A batch can contain at most ${MAX_BATCH_FILES} resumes.` });
  if (err?.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ error: "Unexpected upload field. Use 'resume' for single upload or 'resumes' for batch upload." });
  if (err) {
    const message = /Only PDF and DOCX|valid PDF|valid DOCX|too large|LIMIT/i.test(err.message || "") ? err.message : "Upload request is invalid. Check the file type and size.";
    return res.status(400).json({ error: message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
