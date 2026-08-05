import crypto from "crypto";
import express from "express";
import {
  users as memoryUsers,
  validateStateTransition
} from "./db.js";
import {
  pgGetUserById,
  pgGetUserByEmail,
  pgCreateUser,
  pgGetCandidateProfile,
  pgUpsertCandidateProfile,
  pgGetCompanies,
  pgGetCompanyById,
  pgGetCompanyByOwnerUserId,
  pgCreateCompany,
  pgUpdateCompanyStatus,
  pgGetJobs,
  pgGetJobById,
  pgCreateJob,
  pgUpdateJob,
  pgGetApplications,
  pgGetApplicationById,
  pgCreateApplication,
  pgUpdateApplicationStatus,
  pgUpdateApplicationNotes,
  pgGetFlagReports,
  pgCreateFlagReport,
  pgResolveFlagReport,
  pgDeleteJob,
  pgGetResumeDocument,
  pgCreateResumeDocument,
  pgGetAllUsers,
  pgDeleteUser,
  pgCreateNotification,
  pgGetNotifications,
  pgCreateAuditLog,
  pgGetAuditLogs,
  pgGetSettings,
  pgUpdateSettings,
  seedPgDatabase,
  probeDatabaseConnection
} from "./pg-db.js";
import { hasUsablePgConfig, getDbConfigDiagnostics } from "../src/db/index.js";
import { User, UserRole, CandidateProfile, Company, Application, ApplicationStatus, FlagReport, StatusHistoryItem, AdminLevel, PlatformNotification, AuditLogEntry, JobStatus } from "../src/types";

export const app = express();

// Seed the persistent database (if configured) before the first request is
// served. On serverless deploys this runs lazily per cold start; awaiting it
// prevents the "relation does not exist" race that otherwise occurred when a
// request landed before the tables were created.
export const dbReady: Promise<void> = (async () => {
  try {
    await seedPgDatabase();
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
})();

// JSON Body Parser with enlarged limit for base64 resume previews
app.use(express.json({ limit: "15mb" }));

// Normalize request path so routes match both with and without /api prefix.
// This ONLY applies to genuine Vercel serverless rewrites (vercel.json routes
// /api/(.*) to /api/index?path=$1). Plain SPA client routes (/, /jobs,
// /profile, ...) must pass through untouched so the static middleware in
// server.ts can serve the app shell instead of being rewritten into a bogus
// /api/* 404.
app.use((req, res, next) => {
  let url = req.url || '/';

  try {
    const urlObj = new URL(url, 'http://localhost');
    const pathParam = urlObj.searchParams.get('path');
    const forwardedUri =
      (req.headers['x-forwarded-uri'] as string) ||
      (req.headers['x-invoke-path'] as string) ||
      (req.headers['x-original-url'] as string);

    if (pathParam) {
      url = '/api/' + pathParam.replace(/^\//, '');
    } else if (forwardedUri && forwardedUri.startsWith('/api')) {
      url = forwardedUri;
    } else if (req.originalUrl && req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/api/index')) {
      url = req.originalUrl;
    } else {
      // Not a Vercel rewrite and not an API path: this is a client-side route
      // that the SPA static middleware should handle. Do not rewrite.
      return next();
    }
  } catch {
    // Fallback if URL parsing fails
  }

  const [pathname, search] = url.split('?');
  let normalizedPath = pathname;
  if (!normalizedPath.startsWith('/api')) {
    normalizedPath = '/api' + (normalizedPath.startsWith('/') ? '' : '/') + normalizedPath;
  }

  req.url = search ? `${normalizedPath}?${search}` : normalizedPath;
  next();
});

// Helper for active user header
// IMPORTANT: Never silently fall back to a default account. If the header is
// missing or references a user that no longer exists, return null so callers
// treat the request as unauthenticated instead of impersonating another user.
//
// Fallback to the signed session token: serverless deploys without a database
// can route a follow-up request (e.g. the /me refresh right after register, or
// an application submit) to a DIFFERENT warm instance than the one that wrote
// the new account, so an in-memory lookup fails and the account looks
// "unauthorized". A stateless signed token lets any instance verify the session
// without a shared store. It is strictly more secure than the raw x-user-id
// header, which any caller could already forge.
const SESSION_SECRET =
  process.env.SESSION_SECRET || "moxn-worklink-session-secret-2026";

const signSession = (user: User): string => {
  const payload = JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || null,
    company_id: user.company_id || null,
    created_at: user.created_at,
    admin_level: user.admin_level || null,
    status: user.status || null,
    verified: user.verified || null
  });
  const data = Buffer.from(payload, "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
};

const verifySession = (token: string): User | null => {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
};

const getAuthUser = async (req: express.Request) => {
  const userIdHeader = req.headers["x-user-id"] as string;
  if (userIdHeader && userIdHeader !== 'null' && userIdHeader !== 'undefined' && userIdHeader.trim() !== '') {
    try {
      const found = await pgGetUserById(userIdHeader);
      if (found) return found;
    } catch (err) {
      // DB query failed (transient). Fall through to the stateless signed
      // token, which verifies without touching the database.
    }
  }
  const sessionToken = req.headers["x-session-token"] as string;
  if (sessionToken && sessionToken.trim() !== '') {
    const fromToken = verifySession(sessionToken);
    if (fromToken) return fromToken;
  }
  return null;
};

// -------------------------------------------------------------
// ROLE-BASED ACCESS CONTROL (RBAC)
// -------------------------------------------------------------
const ADMIN_LEVEL_RANK: Record<string, number> = {
  moderator: 1,
  admin: 2,
  super_admin: 3
};

// Returns { ok: true, user } if the requester is an admin of at least the given
// rank, otherwise { ok: false, status, error }.
const requireAdminLevel = async (req: express.Request, minLevel: 'moderator' | 'admin' | 'super_admin') => {
  const user = await getAuthUser(req);
  if (!user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  if (user.role !== 'admin' || !user.admin_level) {
    return { ok: false as const, status: 403, error: "Admin role required." };
  }
  const rank = ADMIN_LEVEL_RANK[user.admin_level] || 0;
  const required = ADMIN_LEVEL_RANK[minLevel] || 1;
  if (rank < required) {
    return { ok: false as const, status: 403, error: `Insufficient permissions. Requires ${minLevel} or higher.` };
  }
  return { ok: true as const, user };
};

// Log an admin action into the audit trail.
const logAudit = async (
  admin: User,
  action: string,
  target_type: string,
  target_id: string,
  target_title: string | undefined,
  details: string | undefined,
  req: express.Request
) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : (req.ip || req.socket?.remoteAddress || '');

  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    admin_user_id: admin.id,
    admin_name: admin.name,
    action,
    target_type,
    target_id,
    target_title,
    details,
    ip_address: ip || undefined,
    created_at: new Date().toISOString()
  };
  await pgCreateAuditLog(entry);
};

const sanitizeString = (value: unknown, maxLen = 500): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
};

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health check. Reports which database configuration the running instance can
// actually see (names only, never values) AND whether it can really connect.
// On Vercel this distinguishes "env vars present" from "database reachable" —
// env vars that are present-but-unusable are the classic cause of "accounts
// disappear after logout": every query fails and the app silently falls back to
// the ephemeral per-instance memory store.
app.get("/api/health", async (req, res) => {
  const dbVars = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    PRISMA_DATABASE_URL: Boolean(process.env.PRISMA_DATABASE_URL),
    SQL_HOST: Boolean(process.env.SQL_HOST)
  };
  const usable = hasUsablePgConfig();
  let probe: { ok: boolean; error?: string | null } | null = null;
  if (usable) {
    try {
      probe = await probeDatabaseConnection();
    } catch (err: any) {
      probe = { ok: false, error: String(err?.message || err).slice(0, 300) };
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: "ok",
    database: probe && probe.ok
      ? "Cloud SQL PostgreSQL (connected)"
      : usable
        ? "Cloud SQL PostgreSQL (configured but NOT reachable — falling back to memory)"
        : "In-Memory Store (no usable database configuration)",
    dbConfigDetected: dbVars,
    urlSchemes: getDbConfigDiagnostics(),
    dbUsable: usable,
    dbReachable: probe ? probe.ok : null,
    instance: process.env.VERCEL ? "vercel-serverless" : "node",
    timestamp: new Date().toISOString()
  });
});

// Auth & Session API
app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.json({
        user: null,
        profile: null,
        company: null,
        availableUsers: memoryUsers
      });
    }

    let profile = null;
    let company = null;

    if (user.role === "candidate") {
      profile = await pgGetCandidateProfile(user.id);
    } else if (user.role === "employer") {
      company = (await pgGetCompanyByOwnerUserId(user.id)) || (user.company_id ? await pgGetCompanyById(user.company_id) : null);
    }

    res.json({
      user,
      profile,
      company,
      availableUsers: memoryUsers
    });
  } catch (err) {
    console.error('API /api/auth/me error:', err);
    res.status(500).json({ error: "Failed to retrieve session." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    let found: User | null = null;
    try {
      found = await pgGetUserByEmail(email);
    } catch (err) {
      console.error('API /api/auth/login DB lookup failed:', err);
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again in a moment — your account is safe." });
    }
    if (!found) {
      return res.status(401).json({ error: "No account found with this email. Please check your email or register a new account." });
    }

    if (found.password && found.password !== password) {
      return res.status(401).json({ error: "Incorrect password. Please verify your credentials and try again." });
    }

    let profile = null;
    let company = null;
    if (found.role === "candidate") {
      profile = await pgGetCandidateProfile(found.id);
    } else if (found.role === "employer") {
      company = (await pgGetCompanyByOwnerUserId(found.id)) || (found.company_id ? await pgGetCompanyById(found.company_id) : null);
    }

    res.json({ success: true, user: found, profile, company, token: signSession(found) });
  } catch (err) {
    console.error('API /api/auth/login error:', err);
    res.status(500).json({ error: "Login failed." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, companyName, headline } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: "Name, email, and account type are required." });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "A password of at least 4 characters is required." });
    }

    const existing = await pgGetUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "An account with this email address already exists. Please sign in." });
    }

    const newUserId = `user-${role.slice(0, 4)}-${Date.now()}`;
    let newCompanyId: string | undefined = undefined;
    let createdCompany: Company | null = null;

    if (role === "employer") {
      newCompanyId = `comp-${Date.now()}`;
      createdCompany = await pgCreateCompany({
        id: newCompanyId,
        owner_user_id: newUserId,
        name: companyName || `${name}'s Organization`,
        logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=250',
        description: `${companyName || name}'s technology team building next-generation platforms.`,
        website: `https://${(companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        status: 'active',
        industry: 'Software & Technology',
        location: 'San Francisco, CA',
        created_at: new Date().toISOString()
      });
    }

    const newUser: User = await pgCreateUser({
      id: newUserId,
      email: email.trim(),
      password: password,
      name: name.trim(),
      role: role as any,
      avatar: undefined,
      company_id: newCompanyId,
      created_at: new Date().toISOString()
    });

    let profile = null;
    if (role === "candidate") {
      profile = await pgUpsertCandidateProfile({
        user_id: newUserId,
        name: name.trim(),
        headline: headline ? headline.trim() : "",
        location: "",
        skills: [],
        links: [],
        bio: "",
        updated_at: new Date().toISOString()
      });
    }

    res.json({ success: true, user: newUser, profile, company: createdCompany, token: signSession(newUser) });
  } catch (err) {
    console.error('API /api/auth/register error:', err);
    res.status(500).json({ error: "Registration failed." });
  }
});

app.post("/api/auth/switch-user", async (req, res) => {
  try {
    const { userId } = req.body;
    const found = await pgGetUserById(userId);
    if (!found) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, user: found, token: signSession(found) });
  } catch (err) {
    res.status(500).json({ error: "User switch failed" });
  }
});

// Jobs API
app.get("/api/jobs", async (req, res) => {
  try {
    const {
      search,
      location,
      employment_type,
      location_type,
      salary_min,
      tags,
      company_id,
      status
    } = req.query;

    const jobsList = await pgGetJobs({
      search: typeof search === 'string' ? search : undefined,
      location: typeof location === 'string' ? location : undefined,
      employment_type: typeof employment_type === 'string' && employment_type !== 'All' ? employment_type : undefined,
      location_type: typeof location_type === 'string' && location_type !== 'All' ? location_type : undefined,
      salary_min: salary_min ? Number(salary_min) : undefined,
      company_id: typeof company_id === 'string' ? company_id : undefined,
      status: typeof status === 'string' && status !== 'all' ? status : undefined
    });

    res.json(jobsList);
  } catch (err) {
    console.error('API /api/jobs error:', err);
    res.status(500).json({ error: "Failed to fetch job listings." });
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  try {
    const job = await pgGetJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job listing not found" });
    }
    const company = await pgGetCompanyById(job.company_id);
    res.json({ ...job, company });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job." });
  }
});

app.post("/api/jobs", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated." });
    }
    if (user.role !== "employer" && user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized: Employer role required to post jobs." });
    }

    let company = (await pgGetCompanyByOwnerUserId(user.id)) || (user.company_id ? await pgGetCompanyById(user.company_id) : null);
    if (!company) {
      const compId = `comp-${Date.now()}`;
      company = await pgCreateCompany({
        id: compId,
        owner_user_id: user.id,
        name: `${user.name}'s Organization`,
        logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=250',
        description: `${user.name}'s technology organization.`,
        website: 'https://example.com',
        status: 'active',
        industry: 'Software & Technology',
        location: 'San Francisco, CA',
        created_at: new Date().toISOString()
      });
      user.company_id = company.id;
      await pgCreateUser(user);
    }

    const {
      title,
      description,
      requirements,
      location,
      location_type,
      employment_type,
      salary_min,
      salary_max,
      salary_currency,
      tags,
      status
    } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ error: "Title, description, and location are required." });
    }

    const newJob = await pgCreateJob({
      id: `job-${Date.now()}`,
      company_id: company.id,
      company_name: company.name,
      company_logo: company.logo,
      company_status: company.status,
      title: title.trim(),
      description: description.trim(),
      requirements: Array.isArray(requirements) ? requirements : [requirements],
      location: location.trim(),
      location_type: location_type || "Hybrid",
      employment_type: employment_type || "Full-time",
      salary_min: Number(salary_min) || 100000,
      salary_max: Number(salary_max) || 150000,
      salary_currency: salary_currency || "USD",
      tags: Array.isArray(tags) ? tags : [],
      status: (status as any) || "published",
      created_at: new Date().toISOString(),
      applicant_count: 0
    });

    res.status(201).json(newJob);
  } catch (err) {
    console.error('API POST /api/jobs error:', err);
    res.status(500).json({ error: "Failed to create job listing." });
  }
});

app.put("/api/jobs/:id", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const job = await pgGetJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job listing not found" });
    }

    const userCompany = (await pgGetCompanyByOwnerUserId(user.id)) || (user.company_id ? await pgGetCompanyById(user.company_id) : null);
    const authorized =
      user.role === "admin" ||
      user.company_id === job.company_id ||
      (userCompany && userCompany.id === job.company_id);

    if (!authorized) {
      return res.status(403).json({ error: "Unauthorized: You can only edit jobs for your company." });
    }

    const updatedJob = await pgUpdateJob(req.params.id, {
      ...req.body,
      id: job.id,
      company_id: job.company_id
    });

    res.json(updatedJob);
  } catch (err) {
    res.status(500).json({ error: "Failed to update job listing." });
  }
});

app.patch("/api/jobs/:id/status", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const job = await pgGetJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const userCompany = (await pgGetCompanyByOwnerUserId(user.id)) || (user.company_id ? await pgGetCompanyById(user.company_id) : null);
    const authorized =
      user.role === "admin" ||
      user.company_id === job.company_id ||
      (userCompany && userCompany.id === job.company_id);

    if (!authorized) {
      return res.status(403).json({ error: "Unauthorized to update job status." });
    }

    const { status } = req.body;
    if (!["draft", "published", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updated = await pgUpdateJob(req.params.id, { status });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update job status." });
  }
});

// Candidate Profiles & Resumes
app.get("/api/candidate/profile", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let profile = await pgGetCandidateProfile(user.id);
    if (!profile) {
      profile = await pgUpsertCandidateProfile({
        user_id: user.id,
        name: user.name,
        headline: "",
        location: "",
        skills: [],
        links: [],
        bio: "",
        updated_at: new Date().toISOString()
      });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch candidate profile." });
  }
});

app.get("/api/candidate/profile/:userId", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const targetUserId = req.params.userId;
    const profile = await pgGetCandidateProfile(targetUserId);
    if (!profile) {
      return res.status(404).json({ error: "Candidate profile not found." });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch candidate profile." });
  }
});

app.put("/api/candidate/profile", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const profileData = req.body;

    if (profileData.avatar !== undefined) {
      user.avatar = profileData.avatar || undefined;
      await pgCreateUser(user);
    }

    // Merge with existing profile so fields not sent by the client
    // (resume_file_id, resume_file_name, years_experience, avatar) are preserved.
    const existing = await pgGetCandidateProfile(user.id);

    const updated = await pgUpsertCandidateProfile({
      ...(existing || {
        user_id: user.id,
        name: user.name,
        headline: "",
        location: "",
        skills: [],
        links: [],
        bio: ""
      }),
      ...profileData,
      user_id: user.id,
      name: user.name,
      updated_at: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update candidate profile." });
  }
});

app.post("/api/candidate/avatar", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { avatar } = req.body;
    user.avatar = avatar || undefined;
    await pgCreateUser(user);

    let profile = await pgGetCandidateProfile(user.id);
    if (!profile) {
      profile = await pgUpsertCandidateProfile({
        user_id: user.id,
        name: user.name,
        headline: "",
        location: "",
        skills: [],
        links: [],
        bio: "",
        updated_at: new Date().toISOString()
      });
    }

    res.json({ success: true, user, profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to update avatar." });
  }
});

app.post("/api/candidate/resume", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { filename, fileSize, dataUrl } = req.body;

    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const maxSizeMb = (await pgGetSettings()).max_resume_size_mb || 10;
    if (fileSize && fileSize > maxSizeMb * 1024 * 1024) {
      return res.status(400).json({
        error: `File size exceeds the ${maxSizeMb}MB limit. Please upload a smaller PDF.`
      });
    }

    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ error: "Resume data is required" });
    }

    const lowerData = dataUrl.toLowerCase();
    const isPdf =
      lowerData.startsWith("data:application/pdf") ||
      lowerData.includes("data:application/pdf;base64,") ||
      /^data:[^;]*pdf/i.test(dataUrl) ||
      /^data:[^,]+;base64,JVBERi0/i.test(dataUrl);
    if (!isPdf) {
      return res.status(400).json({ error: "Only PDF documents are accepted for candidate resumes." });
    }

    const newResume = await pgCreateResumeDocument({
      id: `res-${Date.now()}`,
      user_id: user.id,
      filename: filename,
      file_size: fileSize || 150000,
      content_type: "application/pdf",
      data_url: dataUrl,
      uploaded_at: new Date().toISOString()
    });

    let profile = await pgGetCandidateProfile(user.id);
    if (!profile) {
      profile = {
        user_id: user.id,
        name: user.name,
        headline: "Professional Candidate",
        location: "Remote",
        skills: [],
        links: [],
        bio: "",
        updated_at: new Date().toISOString()
      };
    }
    profile.resume_file_id = newResume.id;
    profile.resume_file_name = newResume.filename;

    await pgUpsertCandidateProfile(profile);

    res.status(201).json(newResume);
  } catch (err) {
    console.error('API POST /api/candidate/resume error:', err);
    res.status(500).json({ error: "Failed to upload resume." });
  }
});

app.get("/api/resumes/:id", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const doc = await pgGetResumeDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Resume document not found." });
    }

    // Ownership guard: candidates may only fetch their own CV. Employers and
    // admins may fetch any CV (they legitimately review applicants), but a
    // candidate must never be able to pull another candidate's resume.
    if (user.role === "candidate" && doc.user_id !== user.id) {
      return res.status(403).json({ error: "You do not have access to this resume document." });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resume document." });
  }
});

// Candidate Applications
app.get("/api/candidate/applications", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const userApps = await pgGetApplications({ candidate_id: user.id });
    res.json(userApps);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch candidate applications." });
  }
});

app.post("/api/candidate/applications", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { job_id, cover_note } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: "Job ID is required." });
    }

    const job = await pgGetJobById(job_id);
    if (!job) {
      return res.status(404).json({ error: "Job listing not found." });
    }

    const existingApps = await pgGetApplications({ candidate_id: user.id, job_id });
    if (existingApps.length > 0) {
      return res.status(400).json({
        error: "You have already submitted an application for this position.",
        existingApplicationId: existingApps[0].id
      });
    }

    const profile = await pgGetCandidateProfile(user.id);
    // Never trust a client-supplied resume id from another account: always
    // resolve the candidate's own resume and use that.
    const resumeId = profile?.resume_file_id || null;
    const resumeName = profile?.resume_file_name || null;

    const now = new Date().toISOString();
    const initialHistory: StatusHistoryItem = {
      id: `hist-${Date.now()}-1`,
      from_status: null,
      to_status: "new",
      updated_by_user_id: user.id,
      updated_by_name: user.name,
      timestamp: now,
      note: "Application submitted by candidate."
    };

    const newApp = await pgCreateApplication({
      id: `app-${Date.now()}`,
      job_id: job.id,
      candidate_id: user.id,
      resume_file_id: resumeId,
      resume_file_name: resumeName,
      cover_note: cover_note || "No cover note provided.",
      status: "new",
      status_history: [initialHistory],
      created_at: now,
      candidate_name: user.name,
      candidate_headline: profile?.headline || "",
      candidate_email: user.email,
      job_title: job.title,
      company_name: job.company_name,
      company_id: job.company_id,
      location: job.location,
      salary_range_formatted: `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max / 1000)}k`
    });

    res.status(201).json(newApp);
  } catch (err) {
    console.error('API POST /api/candidate/applications error:', err);
    res.status(500).json({ error: "Failed to submit job application." });
  }
});

// Employer Applications
app.get("/api/employer/applications", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { jobId } = req.query;

    const userCompany = (await pgGetCompanyByOwnerUserId(user.id)) || (user.company_id ? await pgGetCompanyById(user.company_id) : null);
    const companyId = userCompany ? userCompany.id : user.company_id;

    let empApps: Application[] = [];

    if (user.role === "admin") {
      empApps = await pgGetApplications({ job_id: typeof jobId === 'string' && jobId !== 'all' ? jobId : undefined });
    } else if (companyId) {
      empApps = await pgGetApplications({
        company_id: companyId,
        job_id: typeof jobId === 'string' && jobId !== 'all' ? jobId : undefined
      });
    }

    const enriched = await Promise.all(
      empApps.map(async (a) => {
        const profile = await pgGetCandidateProfile(a.candidate_id);
        const resumeDoc = a.resume_file_id ? await pgGetResumeDocument(a.resume_file_id) : null;
        return {
          ...a,
          candidate_profile: profile,
          resume_document: resumeDoc
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('API GET /api/employer/applications error:', err);
    res.status(500).json({ error: "Failed to fetch employer applications." });
  }
});

app.patch("/api/applications/:id/status", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== 'employer' && user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized: Employer or admin role required." });
    }

    const { to_status, note, force } = req.body;

    const appItem = await pgGetApplicationById(req.params.id);
    if (!appItem) {
      return res.status(404).json({ error: "Application not found." });
    }

    const currentStatus = appItem.status;
    const targetStatus = to_status as ApplicationStatus;

    if (!["new", "reviewing", "interview", "offer", "rejected"].includes(targetStatus)) {
      return res.status(400).json({ error: "Invalid target status provided." });
    }

    const validation = validateStateTransition(currentStatus, targetStatus, force);

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.message,
        current_status: currentStatus,
        target_status: targetStatus,
        requires_force: true
      });
    }

    const now = new Date().toISOString();
    const historyEntry: StatusHistoryItem = {
      id: `hist-${Date.now()}`,
      from_status: currentStatus,
      to_status: targetStatus,
      updated_by_user_id: user ? user.id : 'system',
      updated_by_name: user ? user.name : 'System User',
      timestamp: now,
      note: note || `Moved status from '${currentStatus}' to '${targetStatus}'.`
    };

    const updatedApp = await pgUpdateApplicationStatus(req.params.id, targetStatus, historyEntry);

    res.json({
      success: true,
      message: `Status updated to ${targetStatus}`,
      application: updatedApp
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to transition application status." });
  }
});

app.patch("/api/applications/:id/notes", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (user.role !== 'employer' && user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized: Employer or admin role required." });
    }

    const { internal_notes } = req.body;
    const updated = await pgUpdateApplicationNotes(req.params.id, internal_notes || "");
    if (!updated) {
      return res.status(404).json({ error: "Application not found." });
    }
    res.json({ success: true, internal_notes: updated.internal_notes });
  } catch (err) {
    res.status(500).json({ error: "Failed to update internal notes." });
  }
});

// Admin API & Reports
app.get("/api/admin/companies", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin role required." });
    }

    const allCompanies = await pgGetCompanies();
    res.json(allCompanies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies." });
  }
});

app.patch("/api/admin/companies/:id/status", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin role required." });
    }

    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updatedComp = await pgUpdateCompanyStatus(req.params.id, status);
    if (!updatedComp) {
      return res.status(404).json({ error: "Company not found." });
    }

    res.json(updatedComp);
  } catch (err) {
    res.status(500).json({ error: "Failed to update company status." });
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin role required." });
    }

    const reports = await pgGetFlagReports();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { target_type, target_id, target_title, reason, details } = req.body;

    if (!target_id || !reason) {
      return res.status(400).json({ error: "Target ID and reason are required." });
    }

    const newReport = await pgCreateFlagReport({
      id: `report-${Date.now()}`,
      target_type: target_type || "job",
      target_id,
      target_title: target_title || "Reported Item",
      reason,
      details: details || "",
      status: "open",
      reported_by_user_id: user.id,
      reported_by_name: user.name,
      created_at: new Date().toISOString()
    });

    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit flag report." });
  }
});

app.patch("/api/admin/reports/:id/resolve", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin role required." });
    }

    const resolved = await pgResolveFlagReport(req.params.id);
    if (!resolved) {
      return res.status(404).json({ error: "Report not found." });
    }

    res.json(resolved);
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve report." });
  }
});

app.get("/api/admin/stats", async (req, res) => {
  try {
    const adminUser = await requireAdminLevel(req, 'moderator');
    if (!adminUser.ok) {
      return res.status(adminUser.status).json({ error: adminUser.error });
    }

    const allUsers = await pgGetAllUsers();
    const allJobs = await pgGetJobs({ status: 'all' });
    const allApps = await pgGetApplications({});
    const allCompanies = await pgGetCompanies();
    const allReports = await pgGetFlagReports();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    res.json({
      totalUsers: allUsers.length,
      totalEmployers: allUsers.filter((u) => u.role === 'employer').length,
      totalEmployees: allUsers.filter((u) => u.role === 'candidate').length,
      newRegistrations30d: allUsers.filter((u) => u.created_at >= thirtyDaysAgo).length,
      activeUsers: allUsers.filter((u) => u.status !== 'suspended').length,
      suspendedUsers: allUsers.filter((u) => u.status === 'suspended').length,
      verifiedUsers: allUsers.filter((u) => u.verified).length,
      totalJobs: allJobs.length,
      publishedJobs: allJobs.filter((j) => j.status === 'published').length,
      closedJobs: allJobs.filter((j) => j.status === 'closed').length,
      draftJobs: allJobs.filter((j) => j.status === 'draft').length,
      pendingApprovals: allJobs.filter((j) => j.status === 'draft').length,
      totalApplications: allApps.length,
      totalCompanies: allCompanies.length,
      activeCompanies: allCompanies.filter((c) => c.status === 'active').length,
      suspendedCompanies: allCompanies.filter((c) => c.status === 'suspended').length,
      openReports: allReports.filter((r) => r.status === 'open').length,
      totalReports: allReports.length,
      offers: allApps.filter((a) => a.status === 'offer').length,
      adminCount: allUsers.filter((u) => u.role === 'admin' && (u.admin_level === 'super_admin' || u.admin_level === 'admin')).length,
      moderatorCount: allUsers.filter((u) => u.role === 'admin' && u.admin_level === 'moderator').length,
      systemHealthy: true
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin statistics." });
  }
});

app.post("/api/admin/reset-seed", (req, res) => {
  res.json({ success: true, message: "Seed data active." });
});

// -------------------------------------------------------------
// ADMIN: USER MANAGEMENT
// -------------------------------------------------------------
app.get("/api/admin/users", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    let users = await pgGetAllUsers();
    const {
      role, status, search, verified, sort = 'created_at',
      dir = 'desc', page = '1', limit = '20'
    } = req.query;

    if (role && role !== 'all') users = users.filter((u) => u.role === role);
    if (status && status !== 'all') users = users.filter((u) => (u.status || 'active') === status);
    if (verified === 'true') users = users.filter((u) => u.verified);
    if (verified === 'false') users = users.filter((u) => !u.verified);

    if (search) {
      const term = String(search).toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.id.toLowerCase().includes(term)
      );
    }

    const sortKey = String(sort || 'created_at');
    const dirFactor = dir === 'asc' ? 1 : -1;
    users.sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dirFactor;
      return String(av).localeCompare(String(bv)) * dirFactor;
    });

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const total = users.length;
    const start = (pageNum - 1) * limitNum;
    const items = users.slice(start, start + limitNum);

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('API GET /api/admin/users error:', err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

app.get("/api/admin/users/:id", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const user = await pgGetUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const profile = user.role === 'candidate' ? await pgGetCandidateProfile(user.id) : null;
    const company = user.role === 'employer' ? (await pgGetCompanyByOwnerUserId(user.id) || (user.company_id ? await pgGetCompanyById(user.company_id) : null)) : null;
    const apps = await pgGetApplications({ candidate_id: user.id });

    res.json({ user, profile, company, applications: apps });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user details." });
  }
});

app.patch("/api/admin/users/:id", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'super_admin');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const user = await pgGetUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const { name, email, role, admin_level, status, verified } = req.body;
    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (role && ['candidate', 'employer', 'admin'].includes(role)) user.role = role;
    if (admin_level && ['super_admin', 'admin', 'moderator'].includes(admin_level)) user.admin_level = admin_level;
    if (status && ['active', 'suspended'].includes(status)) user.status = status;
    if (typeof verified === 'boolean') user.verified = verified;

    await pgCreateUser(user);
    await logAudit(auth.user, 'user_update', 'user', user.id, user.name, `Profile updated by super admin.`, req);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user." });
  }
});

app.patch("/api/admin/users/:id/status", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const user = await pgGetUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === 'admin') {
      const subject = await requireAdminLevel(req, 'super_admin');
      if (!subject.ok) return res.status(subject.status).json({ error: "Cannot moderate another admin without super admin." });
    }

    const status = req.body.status === 'suspended' ? 'suspended' : 'active';
    user.status = status;
    await pgCreateUser(user);
    await logAudit(auth.user, status === 'suspended' ? 'user.suspend' : 'user.reactivate', 'user', user.id, user.name, `Status changed to ${status}.`, req);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user status." });
  }
});

app.patch("/api/admin/users/:id/verified", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const user = await pgGetUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const verify = req.body.verified !== false;
    user.verified = verify;
    await pgCreateUser(user);
    await logAudit(auth.user, verify ? 'user.verify' : 'user.unverify', 'user', user.id, user.name, undefined, req);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update verification." });
  }
});

app.patch("/api/admin/users/:id/password", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'admin');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const user = await pgGetUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const { password } = req.body;
    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }
    user.password = String(password);
    await pgCreateUser(user);
    await logAudit(auth.user, 'user.password_reset', 'user', user.id, user.name, undefined, req);
    res.json({ success: true, message: "Password updated." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'super_admin');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    if (req.params.id === auth.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    const user = await pgGetUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === 'admin') {
      return res.status(403).json({ error: "Use Admin Management to remove administrator accounts." });
    }

    await pgDeleteUser(user.id);
    await logAudit(auth.user, 'user.delete', 'user', user.id, user.name, undefined, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

app.post("/api/admin/users/:id/notify", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const user = await pgGetUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const title = sanitizeString(req.body.title, 120);
    const body = sanitizeString(req.body.body, 2000);
    if (!title || !body) return res.status(400).json({ error: "Title and message are required." });

    const notif: PlatformNotification = {
      id: `notif-${Date.now()}`,
      title,
      body,
      audience: 'user',
      target_user_id: user.id,
      created_by_user_id: auth.user.id,
      created_by_name: auth.user.name,
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString()
    };
    await pgCreateNotification(notif);
    await logAudit(auth.user, 'notification.send', 'user', user.id, user.name, title, req);
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: "Failed to send notification." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN: NOTIFICATIONS
// -----------------------------------------------------------------------------
app.get("/api/admin/notifications", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const notifs = await pgGetNotifications();
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

app.post("/api/admin/notifications", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { title, body, audience, target_user_id, scheduled_for } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Title and message are required." });
    if (!['all', 'candidate', 'employer', 'admin', 'user'].includes(audience || 'all')) {
      return res.status(400).json({ error: "Invalid audience." });
    }

    const notif: PlatformNotification = {
      id: `notif-${Date.now()}`,
      title: sanitizeString(title, 120),
      body: sanitizeString(body, 2000),
      audience: audience || 'all',
      target_user_id: audience === 'user' ? target_user_id : undefined,
      created_by_user_id: auth.user.id,
      created_by_name: auth.user.name,
      created_at: new Date().toISOString(),
      scheduled_for: scheduled_for || undefined,
      sent_at: scheduled_for ? null : new Date().toISOString()
    };
    await pgCreateNotification(notif);
    await logAudit(auth.user, 'notification.send', 'notification', notif.id, title, `Audience: ${audience || 'all'}`, req);
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: "Failed to send notification." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN: ANALYTICS
// -----------------------------------------------------------------------------
app.get("/api/admin/analytics", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const users = await pgGetAllUsers();
    const jobs = await pgGetJobs({ status: 'all' });
    const apps = await pgGetApplications({});
    const companies = await pgGetCompanies();

    // Build a 6-month growth series keyed by month label.
    const growth: { label: string; candidates: number; employers: number; jobs: number; applications: number }[] = [];
    const today = new Date();
    for (let m = 5; m >= 0; m--) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();

      const candidates = users.filter((u) => u.role === 'candidate' && u.created_at < next).length;
      const employers = users.filter((u) => u.role === 'employer' && u.created_at < next).length;
      const monthJobs = jobs.filter((j) => j.created_at < next).length;
      const monthApps = apps.filter((a) => a.created_at < next).length;
      growth.push({
        label: d.toLocaleString('default', { month: 'short' }),
        candidates, employers, jobs: monthJobs, applications: monthApps
      });
    }

    // Application status distribution
    const applicationsByStatus = ['new', 'reviewing', 'interview', 'offer', 'rejected'].map((status) => ({
      status,
      count: apps.filter((a) => a.status === status).length
    }));

    // Popular tags
    const tagCount: Record<string, number> = {};
    jobs.forEach((j) => (j.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const tagsByCount = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const popularTags = tagsByCount.map(([tag, count]) => ({ tag, count }));

    // Top employers
    const topEmployers = companies.slice(0, 8).map((c) => {
      const companyJobs = jobs.filter((j) => j.company_id === c.id);
      const companyApps = companyJobs.reduce((sum, j) => sum + (j.applicant_count || 0), 0);
      return { company_id: c.id, company_name: c.name, jobs: companyJobs.length, applications: companyApps };
    }).sort((a, b) => b.applications - a.applications);

    const recentLogs = await pgGetAuditLogs(15);

    res.json({
      growth,
      applicationsByStatus,
      popularTags,
      topEmployers,
      engagement: {
        dailyActive: 12,
        monthlyActive: users.length,
        avgApplicationsPerJob: jobs.length ? (apps.length / jobs.length) : 0,
        conversionRate: apps.length ? (apps.filter((a) => a.status === 'offer').length / apps.length) * 100 : 0
      },
      recentActivity: recentLogs
    });
  } catch (err) {
    console.error('API GET /api/admin/analytics error:', err);
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN: AUDIT LOGS
// -----------------------------------------------------------------------------
app.get("/api/admin/audit-logs", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { search } = req.query;
    let logs = await pgGetAuditLogs(1000);
    if (search) {
      const term = String(search).toLowerCase();
      logs = logs.filter(
        (l) =>
          l.admin_name.toLowerCase().includes(term) ||
          l.action.toLowerCase().includes(term) ||
          l.target_type.toLowerCase().includes(term) ||
          (l.target_title || '').toLowerCase().includes(term)
      );
    }
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN: SETTINGS
// -----------------------------------------------------------------------------
// Public (no auth) subset of settings so clients can display platform rules
// such as the maximum resume size without requiring a login.
app.get("/api/public/settings", async (req, res) => {
  try {
    const settings = await pgGetSettings();
    res.json({
      platform_name: settings.platform_name,
      registration_enabled: settings.registration_enabled,
      maintenance_mode: settings.maintenance_mode,
      max_resume_size_mb: settings.max_resume_size_mb
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings." });
  }
});

app.get("/api/admin/settings", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    res.json(await pgGetSettings());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings." });
  }
});

app.put("/api/admin/settings", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'admin');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const patch: any = {};
    if (req.body.platform_name !== undefined) patch.platform_name = sanitizeString(req.body.platform_name, 80) || 'Moxn Worklink';
    if (req.body.platform_tagline !== undefined) patch.platform_tagline = sanitizeString(req.body.platform_tagline, 120);
    if (req.body.contact_email !== undefined) patch.contact_email = sanitizeString(req.body.contact_email, 120);
    if (req.body.announcement !== undefined) patch.announcement = sanitizeString(req.body.announcement, 500);
    if (req.body.registration_enabled !== undefined) patch.registration_enabled = Boolean(req.body.registration_enabled);
    if (req.body.job_approval_required !== undefined) patch.job_approval_required = Boolean(req.body.job_approval_required);
    if (req.body.maintenance_mode !== undefined) patch.maintenance_mode = Boolean(req.body.maintenance_mode);
    if (req.body.email_notifications_enabled !== undefined) patch.email_notifications_enabled = Boolean(req.body.email_notifications_enabled);
    if (req.body.max_resume_size_mb !== undefined) patch.max_resume_size_mb = Number(req.body.max_resume_size_mb) || 10;

    const settings = await pgUpdateSettings(patch);
    await logAudit(auth.user, 'settings.update', 'settings', 'platform', 'Platform Settings', undefined, req);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN: JOB MANAGEMENT
// -----------------------------------------------------------------------------
app.get("/api/admin/jobs", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const {
      search, status, sort = 'created_at', dir = 'desc',
      page = '1', limit = '20'
    } = req.query;

    let jobs = await pgGetJobs({ status: 'all' });

    if (status && status !== 'all') jobs = jobs.filter((j) => j.status === status);
    if (search) {
      const term = String(search).toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(term) ||
          j.company_name.toLowerCase().includes(term) ||
          (j.location || '').toLowerCase().includes(term) ||
          (j.tags || []).some((t) => t.toLowerCase().includes(term))
      );
    }

    const sortKey = String(sort || 'created_at');
    const dirFactor = dir === 'asc' ? 1 : -1;
    jobs = [...jobs].sort((a: any, b: any) => {
      if (sortKey === 'applicants') {
        return ((a.applicant_count || 0) - (b.applicant_count || 0)) * dirFactor;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') return av.localeCompare(String(bv)) * dirFactor;
      return ((av || 0) - (bv || 0)) * dirFactor;
    });

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const total = jobs.length;
    const items = jobs.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({ items, total, page: pageNum, limit: pageSize });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs." });
  }
});

app.patch("/api/admin/jobs/:id/status", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { status } = req.body;
    if (!['draft', 'published', 'closed'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updated = await pgUpdateJob(req.params.id, { status });
    if (!updated) return res.status(404).json({ error: "Job not found." });

    await logAudit(auth.user, 'job.update', 'job', updated.id, updated.title, `Status: ${status}`, req);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update job status." });
  }
});

app.delete("/api/admin/jobs/:id", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'super_admin');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const deleted = await pgDeleteJob(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Job not found." });

    await logAudit(auth.user, 'job.delete', 'job', req.params.id, 'Deleted job', undefined, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete job." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN: APPLICATIONS
// -----------------------------------------------------------------------------
app.get("/api/admin/applications", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { search, status, sort = 'created_at', dir = 'desc', page = '1', limit = '20' } = req.query;

    let apps = await pgGetApplications({});

    if (status && status !== 'all') apps = apps.filter((a) => a.status === status);
    if (search) {
      const term = String(search).toLowerCase();
      apps = apps.filter(
        (a) =>
          a.candidate_name?.toLowerCase().includes(term) ||
          a.job_title?.toLowerCase().includes(term) ||
          a.company_name?.toLowerCase().includes(term)
      );
    }

    const sortKey = String(sort || 'created_at');
    const dirFactor = dir === 'asc' ? 1 : -1;
    apps = [...apps].sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') return av.localeCompare(String(bv)) * dirFactor;
      return ((av || 0) - (bv || 0)) * dirFactor;
    });

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const total = apps.length;
    const items = apps.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({ items, total, page: pageNum, limit: pageSize });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications." });
  }
});

app.patch("/api/admin/applications/:id/status", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { status } = req.body;
    if (!['new', 'reviewing', 'interview', 'offer', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid application status." });
    }

    const app = await pgGetApplicationById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found." });

    const historyEntry: StatusHistoryItem = {
      id: `hist-${Date.now()}`,
      from_status: app.status,
      to_status: status,
      updated_by_user_id: auth.user.id,
      updated_by_name: auth.user.name,
      timestamp: new Date().toISOString(),
      note: `Status changed by ${auth.user.name} (admin)`
    };
    const updated = await pgUpdateApplicationStatus(app.id, status as ApplicationStatus, historyEntry);
    await logAudit(auth.user, 'application.update', 'application', app.id, `${app.job_title}`, `Status: ${status}`, req);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update application status." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN: REPORTS
// -----------------------------------------------------------------------------
app.get("/api/admin/reports", async (req, res) => {
  try {
    const auth = await requireAdminLevel(req, 'moderator');
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { status, page = '1', limit = '20' } = req.query;
    let reports = await pgGetFlagReports();

    if (status && status !== 'all') reports = reports.filter((r) => r.status === status);
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const total = reports.length;
    const items = reports.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({ items, total, page: pageNum, limit: pageSize });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

app.get("/api/admin/me", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: "Admin role required." });
  }
  res.json({ user });
});

// Fallback JSON 404 handler for API routes. Non-API GET requests (client-side
// routes like /jobs or /profile) are passed through so the SPA static
// middleware registered later (in server.ts) can serve the app shell instead
// of returning a JSON 404.
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return next();
  }
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl || req.url}` });
});

// Global JSON error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err?.status || err?.statusCode || (err?.type === 'entity.too.large' ? 413 : 0);
  if (status && status >= 400 && status < 500) {
    if (status === 413) {
      return res.status(413).json({ error: "Payload too large. The uploaded file exceeds the maximum allowed size." });
    }
    return res.status(status).json({ error: err?.message || "Bad request." });
  }
  console.error("Unhandled API Server Error:", err);
  res.status(500).json({ error: err?.message || "Internal server error occurred." });
});

export default app;
