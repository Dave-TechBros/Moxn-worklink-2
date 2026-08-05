import { db, schema, ensureSchema, isPgConfigured, getDb } from '../src/db/index.js';
import { eq, desc, sql, and, isNull } from 'drizzle-orm';
import {
  User,
  CandidateProfile,
  Company,
  Job,
  Application,
  FlagReport,
  ResumeDocument,
  ApplicationStatus,
  StatusHistoryItem,
  PlatformNotification,
  AuditLogEntry,
  PlatformSettings
} from '../src/types';
import {
  users as memUsers,
  candidateProfiles as memProfiles,
  companies as memCompanies,
  jobs as memJobs,
  applications as memApps,
  flagReports as memFlags,
  resumeDocuments as memResumes,
  notifications as memNotifications,
  auditLogs as memAuditLogs,
  getSettings,
  updateSettings,
  flushStore
} from './db.js';

const isPgAvailable = () => isPgConfigured();

// True connection check used by /api/health. Env vars can be present yet
// unusable (wrong scheme, bad credentials, unreachable host), and in that case
// the pg-* helpers silently fall back to the ephemeral per-instance memory
// store — which makes new accounts "disappear" after logout. Result is cached
// briefly so the health probe does not hammer the database.
let probeCache: { at: number; result: { ok: boolean; error?: string | null } } | null = null;

export async function probeDatabaseConnection(force = false): Promise<{ ok: boolean; error?: string | null }> {
  if (!force && probeCache && Date.now() - probeCache.at < 30000) {
    return probeCache.result;
  }
  const instance = getDb();
  if (!instance) {
    const result = { ok: false, error: 'no usable database configuration' };
    probeCache = { at: Date.now(), result };
    return result;
  }
  try {
    await Promise.race([
      instance.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('connection timed out')), 5000))
    ]);
    const result = { ok: true, error: null };
    probeCache = { at: Date.now(), result };
    return result;
  } catch (err: any) {
    const result = { ok: false, error: String(err?.message || err).slice(0, 300) };
    probeCache = { at: Date.now(), result };
    return result;
  }
}

// -------------------------------------------------------------
// SEEDING FUNCTION
// -------------------------------------------------------------
export async function seedPgDatabase() {
  if (!isPgAvailable()) return;
  try {
    // Ensure tables exist (and any newer columns are added) before touching
    // them; without this the first request would fail with "relation does not
    // exist" or "column does not exist" on pre-existing databases.
    await ensureSchema();
    // Existing databases created before the users table had admin_level cannot
    // hold the seeded admin's level. Backfill it so requireAdminLevel works.
    await db.update(schema.users)
      .set({ admin_level: 'super_admin' })
      .where(and(eq(schema.users.role, 'admin'), isNull(schema.users.admin_level)));
    const existingUsers = await db.select().from(schema.users).limit(1);
    if (existingUsers.length === 0) {
      console.log('[Cloud SQL] Seeding initial database records...');
      for (const u of memUsers) {
        await db.insert(schema.users).values(u).onConflictDoNothing();
      }
      for (const p of Object.values(memProfiles)) {
        await db.insert(schema.candidateProfiles).values(p).onConflictDoNothing();
      }
      for (const c of memCompanies) {
        await db.insert(schema.companies).values(c).onConflictDoNothing();
      }
      for (const j of memJobs) {
        await db.insert(schema.jobs).values(j).onConflictDoNothing();
      }
      for (const a of memApps) {
        await db.insert(schema.applications).values(a).onConflictDoNothing();
      }
      for (const f of memFlags) {
        await db.insert(schema.flagReports).values(f).onConflictDoNothing();
      }
      for (const r of Object.values(memResumes)) {
        await db.insert(schema.resumeDocuments).values(r).onConflictDoNothing();
      }
      console.log('[Cloud SQL] Initial database seeding completed successfully.');
    }
  } catch (err) {
    console.warn('[Cloud SQL] Seeding failed or skipped, using memory store:', err);
  }
}

// -------------------------------------------------------------
// USER HELPERS
// -------------------------------------------------------------
export async function pgGetUserById(id: string): Promise<User | null> {
  if (isPgAvailable()) {
    // DB mode. A query error must NOT be conflated with "account not found":
    // throwing here lets auth routes surface a retryable error instead of
    // telling the user a real account vanished. The memory store is only used
    // when no database is configured at all (demo/local mode).
    const res = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (res[0]) return res[0] as User;
    return null;
  }
  return memUsers.find((u) => u.id === id) || null;
}

export async function pgGetUserByEmail(email: string): Promise<User | null> {
  const normalized = email.toLowerCase().trim();
  if (isPgAvailable()) {
    const res = await db.select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
    if (res[0]) return res[0] as User;
    return null;
  }
  return memUsers.find((u) => u.email.toLowerCase().trim() === normalized) || null;
}

export async function pgCreateUser(user: User): Promise<User> {
  const normalizedEmail = user.email.toLowerCase().trim();
  const userToSave = { ...user, email: normalizedEmail };

  if (isPgAvailable()) {
    // DB mode: never silently write the account only to the ephemeral
    // per-instance memory store — that is exactly how accounts "disappear"
    // after logout. If the insert fails, throw so registration surfaces an
    // error instead of reporting a success that cannot be logged into later.
    const res = await db.insert(schema.users).values(userToSave).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        email: normalizedEmail,
        name: user.name,
        role: user.role,
        avatar: user.avatar || null,
        company_id: user.company_id || null,
        password: user.password ?? null
      }
    }).returning();
    if (!res[0]) {
      throw new Error('User insert returned no row.');
    }
    flushStore();
    return res[0] as User;
  }

  const existingIdx = memUsers.findIndex((u) => u.id === user.id || u.email.toLowerCase().trim() === normalizedEmail);
  if (existingIdx >= 0) {
    memUsers[existingIdx] = { ...memUsers[existingIdx], ...userToSave };
    flushStore();
    return memUsers[existingIdx];
  } else {
    memUsers.push(userToSave);
    flushStore();
    return userToSave;
  }
}

// -------------------------------------------------------------
// CANDIDATE PROFILE HELPERS
// -------------------------------------------------------------
export async function pgGetCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.select().from(schema.candidateProfiles).where(eq(schema.candidateProfiles.user_id, userId)).limit(1);
      if (res[0]) return res[0] as CandidateProfile;
    } catch (err) {
      console.warn('Postgres profile query failed, using memory store:', err);
    }
  }
  return memProfiles[userId] || null;
}

export async function pgUpsertCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
  if (isPgAvailable()) {
    try {
      const res = await db.insert(schema.candidateProfiles).values(profile).onConflictDoUpdate({
        target: schema.candidateProfiles.user_id,
        set: {
          name: profile.name,
          avatar: profile.avatar || null,
          headline: profile.headline,
          location: profile.location,
          skills: profile.skills,
          resume_file_id: profile.resume_file_id || null,
          resume_file_name: profile.resume_file_name || null,
          links: profile.links,
          bio: profile.bio,
          years_experience: profile.years_experience || null,
          updated_at: profile.updated_at
        }
      }).returning();
      if (res[0]) {
        flushStore();
        return res[0] as CandidateProfile;
      }
    } catch (err) {
      console.warn('Postgres profile upsert failed, using memory store:', err);
    }
  }
  memProfiles[profile.user_id] = profile;
  flushStore();
  return profile;
}

// -------------------------------------------------------------
// COMPANY HELPERS
// -------------------------------------------------------------
export async function pgGetCompanies(): Promise<Company[]> {
  if (isPgAvailable()) {
    try {
      return (await db.select().from(schema.companies)) as Company[];
    } catch (err) {
      console.warn('Postgres company query failed, using memory store:', err);
    }
  }
  return memCompanies;
}

export async function pgGetCompanyById(id: string): Promise<Company | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.select().from(schema.companies).where(eq(schema.companies.id, id)).limit(1);
      if (res[0]) return res[0] as Company;
    } catch (err) {
      console.warn('Postgres company by id query failed, using memory store:', err);
    }
  }
  return memCompanies.find((c) => c.id === id) || null;
}

export async function pgGetCompanyByOwnerUserId(ownerUserId: string): Promise<Company | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.select().from(schema.companies).where(eq(schema.companies.owner_user_id, ownerUserId)).limit(1);
      if (res[0]) return res[0] as Company;
    } catch (err) {
      console.warn('Postgres company query failed, using memory store:', err);
    }
  }
  return memCompanies.find((c) => c.owner_user_id === ownerUserId) || null;
}

export async function pgCreateCompany(company: Company): Promise<Company> {
  if (isPgAvailable()) {
    try {
      const res = await db.insert(schema.companies).values(company).returning();
      if (res[0]) {
        flushStore();
        return res[0] as Company;
      }
    } catch (err) {
      console.warn('Postgres create company failed, using memory store:', err);
    }
  }
  memCompanies.push(company);
  flushStore();
  return company;
}

export async function pgUpdateCompanyStatus(companyId: string, status: 'active' | 'suspended'): Promise<Company | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.update(schema.companies).set({ status }).where(eq(schema.companies.id, companyId)).returning();
      const allJobs = await db.select().from(schema.jobs).where(eq(schema.jobs.company_id, companyId));
      for (const job of allJobs) {
        await db.update(schema.jobs).set({ company_status: status }).where(eq(schema.jobs.id, job.id));
      }
      if (res[0]) {
        flushStore();
        return res[0] as Company;
      }
    } catch (err) {
      console.warn('Postgres update company status failed, using memory store:', err);
    }
  }
  const comp = memCompanies.find((c) => c.id === companyId);
  if (comp) {
    comp.status = status;
    memJobs.filter((j) => j.company_id === companyId).forEach((j) => { j.company_status = status; });
  }
  flushStore();
  return comp || null;
}

// -------------------------------------------------------------
// JOB HELPERS
// -------------------------------------------------------------
export async function pgGetJobs(params: {
  search?: string;
  location?: string;
  employment_type?: string;
  location_type?: string;
  salary_min?: number;
  company_id?: string;
  status?: string;
}): Promise<Job[]> {
  let allJobs: Job[] = memJobs;
  if (isPgAvailable()) {
    try {
      const dbJobs = (await db.select().from(schema.jobs).orderBy(desc(schema.jobs.created_at))) as Job[];
      const allCompanies = (await db.select().from(schema.companies)) as Company[];
      const companyMap = new Map(allCompanies.map((c) => [c.id, c]));
      allJobs = dbJobs.map((j) => {
        const comp = companyMap.get(j.company_id);
        return {
          ...j,
          company_status: (comp ? comp.status : j.company_status || 'active') as 'active' | 'suspended'
        };
      });
    } catch (err) {
      console.warn('Postgres jobs query failed, using memory store:', err);
      allJobs = memJobs;
    }
  }

  let filtered: Job[] = [...allJobs];

  if (params.company_id) {
    filtered = filtered.filter((j) => j.company_id === params.company_id);
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((j) => j.status === params.status);
  } else if (!params.status) {
    filtered = filtered.filter((j) => j.status === 'published' && j.company_status !== 'suspended');
  }

  if (params.search) {
    const term = params.search.toLowerCase();
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(term) ||
        j.description.toLowerCase().includes(term) ||
        j.company_name.toLowerCase().includes(term) ||
        (j.tags && j.tags.some((t) => t.toLowerCase().includes(term)))
    );
  }

  if (params.location) {
    const locTerm = params.location.toLowerCase();
    filtered = filtered.filter((j) => j.location.toLowerCase().includes(locTerm));
  }

  if (params.employment_type) {
    filtered = filtered.filter((j) => j.employment_type === params.employment_type);
  }

  if (params.location_type) {
    filtered = filtered.filter((j) => j.location_type === params.location_type);
  }

  if (params.salary_min && !isNaN(params.salary_min)) {
    filtered = filtered.filter((j) => j.salary_max >= params.salary_min!);
  }

  return filtered;
}

export async function pgGetJobById(id: string): Promise<Job | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).limit(1);
      if (res[0]) {
        const job = res[0] as Job;
        const compRes = await db.select().from(schema.companies).where(eq(schema.companies.id, job.company_id)).limit(1);
        if (compRes[0]) {
          job.company_status = compRes[0].status as any;
        }
        return job;
      }
    } catch (err) {
      console.warn('Postgres job by id failed, using memory store:', err);
    }
  }
  return memJobs.find((j) => j.id === id) || null;
}

export async function pgCreateJob(job: Job): Promise<Job> {
  if (isPgAvailable()) {
    try {
      const res = await db.insert(schema.jobs).values(job).returning();
      if (res[0]) {
        flushStore();
        return res[0] as Job;
      }
    } catch (err) {
      console.warn('Postgres create job failed, using memory store:', err);
    }
  }
  memJobs.unshift(job);
  flushStore();
  return job;
}

export async function pgUpdateJob(jobId: string, jobData: Partial<Job>): Promise<Job | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.update(schema.jobs).set(jobData).where(eq(schema.jobs.id, jobId)).returning();
      if (res[0]) {
        flushStore();
        return res[0] as Job;
      }
    } catch (err) {
      console.warn('Postgres update job failed, using memory store:', err);
    }
  }
  const idx = memJobs.findIndex((j) => j.id === jobId);
  if (idx >= 0) {
    memJobs[idx] = { ...memJobs[idx], ...jobData };
    flushStore();
    return memJobs[idx];
  }
  return null;
}

export async function pgDeleteJob(jobId: string): Promise<boolean> {
  if (isPgAvailable()) {
    try {
      const res = await db.delete(schema.jobs).where(eq(schema.jobs.id, jobId)).returning();
      if (res[0]) {
        flushStore();
        return true;
      }
    } catch (err) {
      console.warn('Postgres delete job failed, using memory store:', err);
    }
  }
  const idx = memJobs.findIndex((j) => j.id === jobId);
  if (idx >= 0) {
    memJobs.splice(idx, 1);
    flushStore();
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// APPLICATION HELPERS
// -------------------------------------------------------------
export async function pgGetApplications(params: {
  candidate_id?: string;
  company_id?: string;
  job_id?: string;
}): Promise<Application[]> {
  let allApps: Application[] = memApps;
  if (isPgAvailable()) {
    try {
      allApps = (await db.select().from(schema.applications).orderBy(desc(schema.applications.created_at))) as Application[];
    } catch (err) {
      console.warn('Postgres get applications failed, using memory store:', err);
      allApps = memApps;
    }
  }

  if (params.candidate_id) {
    allApps = allApps.filter((a) => a.candidate_id === params.candidate_id);
  }
  if (params.company_id) {
    allApps = allApps.filter((a) => a.company_id === params.company_id);
  }
  if (params.job_id) {
    allApps = allApps.filter((a) => a.job_id === params.job_id);
  }

  return allApps;
}

export async function pgGetApplicationById(id: string): Promise<Application | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.select().from(schema.applications).where(eq(schema.applications.id, id)).limit(1);
      if (res[0]) return res[0] as Application;
    } catch (err) {
      console.warn('Postgres get app by id failed, using memory store:', err);
    }
  }
  return memApps.find((a) => a.id === id) || null;
}

export async function pgCreateApplication(appData: Application): Promise<Application> {
  if (isPgAvailable()) {
    try {
      const res = await db.insert(schema.applications).values(appData).returning();
      const job = await pgGetJobById(appData.job_id);
      if (job) {
        await db.update(schema.jobs).set({ applicant_count: (job.applicant_count || 0) + 1 }).where(eq(schema.jobs.id, job.id));
      }
      if (res[0]) {
        flushStore();
        return res[0] as Application;
      }
    } catch (err) {
      console.warn('Postgres create application failed, using memory store:', err);
    }
  }
  memApps.unshift(appData);
  const job = memJobs.find((j) => j.id === appData.job_id);
  if (job) {
    job.applicant_count = (job.applicant_count || 0) + 1;
  }
  flushStore();
  return appData;
}

export async function pgUpdateApplicationStatus(
  appId: string,
  targetStatus: ApplicationStatus,
  historyEntry: StatusHistoryItem
): Promise<Application | null> {
  if (isPgAvailable()) {
    try {
      const existing = await pgGetApplicationById(appId);
      if (existing) {
        const newHistory = [...(existing.status_history || []), historyEntry];
        const res = await db
          .update(schema.applications)
          .set({ status: targetStatus, status_history: newHistory })
          .where(eq(schema.applications.id, appId))
          .returning();
        if (res[0]) {
          flushStore();
          return res[0] as Application;
        }
      }
    } catch (err) {
      console.warn('Postgres update app status failed, using memory store:', err);
    }
  }
  const app = memApps.find((a) => a.id === appId);
  if (app) {
    app.status = targetStatus;
    app.status_history = [...(app.status_history || []), historyEntry];
    flushStore();
    return app;
  }
  return null;
}

export async function pgUpdateApplicationNotes(appId: string, internalNotes: string): Promise<Application | null> {
  if (isPgAvailable()) {
    try {
      const res = await db
        .update(schema.applications)
        .set({ internal_notes: internalNotes })
        .where(eq(schema.applications.id, appId))
        .returning();
      if (res[0]) {
        flushStore();
        return res[0] as Application;
      }
    } catch (err) {
      console.warn('Postgres update app notes failed, using memory store:', err);
    }
  }
  const app = memApps.find((a) => a.id === appId);
  if (app) {
    app.internal_notes = internalNotes;
    flushStore();
    return app;
  }
  return null;
}

// -------------------------------------------------------------
// FLAG REPORT HELPERS
// -------------------------------------------------------------
export async function pgGetFlagReports(): Promise<FlagReport[]> {
  if (isPgAvailable()) {
    try {
      return (await db.select().from(schema.flagReports).orderBy(desc(schema.flagReports.created_at))) as FlagReport[];
    } catch (err) {
      console.warn('Postgres get flag reports failed, using memory store:', err);
    }
  }
  return memFlags;
}

export async function pgCreateFlagReport(report: FlagReport): Promise<FlagReport> {
  if (isPgAvailable()) {
    try {
      const res = await db.insert(schema.flagReports).values(report).returning();
      if (res[0]) {
        flushStore();
        return res[0] as FlagReport;
      }
    } catch (err) {
      console.warn('Postgres create flag report failed, using memory store:', err);
    }
  }
  memFlags.unshift(report);
  flushStore();
  return report;
}

export async function pgResolveFlagReport(id: string): Promise<FlagReport | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.update(schema.flagReports).set({ status: 'resolved' }).where(eq(schema.flagReports.id, id)).returning();
      if (res[0]) {
        flushStore();
        return res[0] as FlagReport;
      }
    } catch (err) {
      console.warn('Postgres resolve flag report failed, using memory store:', err);
    }
  }
  const rep = memFlags.find((r) => r.id === id);
  if (rep) rep.status = 'resolved';
  flushStore();
  return rep || null;
}

// -------------------------------------------------------------
// RESUME DOCUMENT HELPERS
// -------------------------------------------------------------
export async function pgGetResumeDocument(id: string): Promise<ResumeDocument | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.select().from(schema.resumeDocuments).where(eq(schema.resumeDocuments.id, id)).limit(1);
      if (res[0]) return res[0] as ResumeDocument;
    } catch (err) {
      console.warn('Postgres get resume doc failed, using memory store:', err);
    }
  }
  return memResumes[id] || null;
}

export async function pgCreateResumeDocument(doc: ResumeDocument): Promise<ResumeDocument> {
  if (isPgAvailable()) {
    try {
      const res = await db.insert(schema.resumeDocuments).values(doc).returning();
      if (res[0]) {
        flushStore();
        return res[0] as ResumeDocument;
      }
    } catch (err) {
      console.warn('Postgres create resume doc failed, using memory store:', err);
    }
  }
  memResumes[doc.id] = doc;
  flushStore();
  return doc;
}

// -------------------------------------------------------------
// ADMIN: USER MANAGEMENT HELPERS
// -------------------------------------------------------------
export async function pgGetAllUsers(): Promise<User[]> {
  if (isPgAvailable()) {
    try {
      const rows = await db.select().from(schema.users);
      return rows as User[];
    } catch (err) {
      console.warn('Postgres get all users failed, using memory store:', err);
    }
  }
  return memUsers;
}

export async function pgDeleteUser(userId: string): Promise<boolean> {
  if (isPgAvailable()) {
    try {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
      for (let i = memApps.length - 1; i >= 0; i--) if (memApps[i].candidate_id === userId) memApps.splice(i, 1);
      for (const k of Object.keys(memProfiles)) if (memProfiles[k].user_id === userId) delete memProfiles[k];
      flushStore();
      return true;
    } catch (err) {
      console.warn('Postgres delete user failed, using memory store:', err);
    }
  }
  const idx = memUsers.findIndex((u) => u.id === userId);
  if (idx >= 0) memUsers.splice(idx, 1);
  for (let i = memApps.length - 1; i >= 0; i--) if (memApps[i].candidate_id === userId) memApps.splice(i, 1);
  for (const k of Object.keys(memProfiles)) if (memProfiles[k].user_id === userId) delete memProfiles[k];
  flushStore();
  return true;
}

// -------------------------------------------------------------
// ADMIN: NOTIFICATION HELPERS
// -------------------------------------------------------------
export async function pgCreateNotification(n: PlatformNotification): Promise<PlatformNotification> {
  memNotifications.unshift(n);
  flushStore();
  return n;
}

export async function pgGetNotifications(): Promise<PlatformNotification[]> {
  return memNotifications;
}

// -------------------------------------------------------------
// ADMIN: AUDIT LOG HELPERS
// -------------------------------------------------------------
export async function pgCreateAuditLog(entry: AuditLogEntry): Promise<AuditLogEntry> {
  memAuditLogs.unshift(entry);
  flushStore();
  return entry;
}

export async function pgGetAuditLogs(limit = 500): Promise<AuditLogEntry[]> {
  return memAuditLogs.slice(0, limit);
}

// -------------------------------------------------------------
// ADMIN: SETTINGS HELPERS
// -------------------------------------------------------------
export async function pgGetSettings(): Promise<PlatformSettings> {
  return getSettings();
}

export async function pgUpdateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const updated = updateSettings(patch);
  flushStore();
  return updated;
}

if (isPgAvailable()) {
  seedPgDatabase().catch((err) => {
    console.warn('[Cloud SQL] Automatic seeding skipped:', err);
  });
}
