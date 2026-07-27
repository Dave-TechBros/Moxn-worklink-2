import express from "express";
import {
  users as memoryUsers,
  validateStateTransition
} from "./db";
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
  pgGetResumeDocument,
  pgCreateResumeDocument
} from "./pg-db";
import { User, UserRole, CandidateProfile, Company, Application, ApplicationStatus, FlagReport, StatusHistoryItem } from "../src/types";

export const app = express();

// JSON Body Parser with enlarged limit for base64 resume previews
app.use(express.json({ limit: "15mb" }));

// Normalize request path so routes match both with and without /api prefix (critical for Vercel Serverless Function rewrites)
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  next();
});

// Helper for active user header
const getAuthUser = async (req: express.Request) => {
  const userIdHeader = req.headers["x-user-id"] as string;
  if (userIdHeader && userIdHeader !== 'null' && userIdHeader !== 'undefined' && userIdHeader.trim() !== '') {
    const found = await pgGetUserById(userIdHeader);
    if (found) return found;
  }
  return (await pgGetUserById('user-emp-1')) || (await pgGetUserById('user-cand-1'));
};

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: process.env.SQL_HOST ? "Cloud SQL PostgreSQL" : "In-Memory Store", timestamp: new Date().toISOString() });
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

    const found = await pgGetUserByEmail(email);
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

    res.json({ success: true, user: found, profile, company });
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

    res.json({ success: true, user: newUser, profile, company: createdCompany });
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
    res.json({ success: true, user: found });
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

    const updated = await pgUpsertCandidateProfile({
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

    const newResume = await pgCreateResumeDocument({
      id: `res-${Date.now()}`,
      user_id: user.id,
      filename: filename,
      file_size: fileSize || 150000,
      content_type: "application/pdf",
      data_url: dataUrl || "data:application/pdf;base64,JVBERi0xLjQKJ...[Uploaded PDF Document]",
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
    const doc = await pgGetResumeDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Resume document not found." });
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

    const { job_id, resume_file_id, cover_note } = req.body;

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
    const resumeId = resume_file_id || profile?.resume_file_id || "res-cand-1";
    const resumeName = profile?.resume_file_name || "Resume_Document.pdf";

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
      candidate_headline: profile?.headline || "Software Engineering Professional",
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
    const allCompanies = await pgGetCompanies();
    res.json(allCompanies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies." });
  }
});

app.patch("/api/admin/companies/:id/status", async (req, res) => {
  try {
    const user = await getAuthUser(req);
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
    const reports = await pgGetFlagReports();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const user = await getAuthUser(req);
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
    const user = await getAuthUser(req);
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin role required." });
    }

    const allJobs = await pgGetJobs({ status: 'all' });
    const allApps = await pgGetApplications({});
    const allCompanies = await pgGetCompanies();
    const allReports = await pgGetFlagReports();

    res.json({
      totalJobs: allJobs.length,
      publishedJobs: allJobs.filter((j) => j.status === "published").length,
      totalApplications: allApps.length,
      totalCompanies: allCompanies.length,
      activeCompanies: allCompanies.filter((c) => c.status === "active").length,
      openReports: allReports.filter((r) => r.status === "open").length
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin statistics." });
  }
});

app.post("/api/admin/reset-seed", (req, res) => {
  res.json({ success: true, message: "Seed data active." });
});

// Fallback JSON 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl || req.url}` });
});

// Global JSON error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled API Server Error:", err);
  res.status(500).json({ error: err?.message || "Internal server error occurred." });
});

export default app;
