import { db, schema } from '../src/db/index.ts';
import { eq, desc } from 'drizzle-orm';
import {
  User,
  CandidateProfile,
  Company,
  Job,
  Application,
  FlagReport,
  ResumeDocument,
  ApplicationStatus,
  StatusHistoryItem
} from '../src/types.js';
import {
  users as memUsers,
  candidateProfiles as memProfiles,
  companies as memCompanies,
  jobs as memJobs,
  applications as memApps,
  flagReports as memFlags,
  resumeDocuments as memResumes
} from './db.js';

const isPgAvailable = () => Boolean(process.env.SQL_HOST);

// -------------------------------------------------------------
// SEEDING FUNCTION
// -------------------------------------------------------------
export async function seedPgDatabase() {
  if (!isPgAvailable()) return;
  try {
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
    try {
      const res = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      if (res[0]) return res[0] as User;
    } catch (err) {
      console.warn('Postgres query failed, falling back to memory store:', err);
    }
  }
  return memUsers.find((u) => u.id === id) || null;
}

export async function pgGetUserByEmail(email: string): Promise<User | null> {
  const normalized = email.toLowerCase().trim();
  if (isPgAvailable()) {
    try {
      const res = await db.select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1);
      if (res[0]) return res[0] as User;
    } catch (err) {
      console.warn('Postgres query failed, falling back to memory store:', err);
    }
  }
  return memUsers.find((u) => u.email.toLowerCase().trim() === normalized) || null;
}

export async function pgCreateUser(user: User): Promise<User> {
  const normalizedEmail = user.email.toLowerCase().trim();
  const userToSave = { ...user, email: normalizedEmail };

  if (isPgAvailable()) {
    try {
      const res = await db.insert(schema.users).values(userToSave).onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: normalizedEmail,
          name: user.name,
          role: user.role,
          avatar: user.avatar || null,
          company_id: user.company_id || null
        }
      }).returning();
      if (res[0]) return res[0] as User;
    } catch (err) {
      console.warn('Postgres insert failed, using memory store:', err);
    }
  }

  const existingIdx = memUsers.findIndex((u) => u.id === user.id || u.email.toLowerCase().trim() === normalizedEmail);
  if (existingIdx >= 0) {
    memUsers[existingIdx] = { ...memUsers[existingIdx], ...userToSave };
    return memUsers[existingIdx];
  } else {
    memUsers.push(userToSave);
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
      if (res[0]) return res[0] as CandidateProfile;
    } catch (err) {
      console.warn('Postgres profile upsert failed, using memory store:', err);
    }
  }
  memProfiles[profile.user_id] = profile;
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
      if (res[0]) return res[0] as Company;
    } catch (err) {
      console.warn('Postgres create company failed, using memory store:', err);
    }
  }
  memCompanies.push(company);
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
      if (res[0]) return res[0] as Company;
    } catch (err) {
      console.warn('Postgres update company status failed, using memory store:', err);
    }
  }
  const comp = memCompanies.find((c) => c.id === companyId);
  if (comp) {
    comp.status = status;
    memJobs.filter((j) => j.company_id === companyId).forEach((j) => { j.company_status = status; });
  }
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

  if (params.status) {
    filtered = filtered.filter((j) => j.status === params.status);
  } else {
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
      if (res[0]) return res[0] as Job;
    } catch (err) {
      console.warn('Postgres create job failed, using memory store:', err);
    }
  }
  memJobs.unshift(job);
  return job;
}

export async function pgUpdateJob(jobId: string, jobData: Partial<Job>): Promise<Job | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.update(schema.jobs).set(jobData).where(eq(schema.jobs.id, jobId)).returning();
      if (res[0]) return res[0] as Job;
    } catch (err) {
      console.warn('Postgres update job failed, using memory store:', err);
    }
  }
  const idx = memJobs.findIndex((j) => j.id === jobId);
  if (idx >= 0) {
    memJobs[idx] = { ...memJobs[idx], ...jobData };
    return memJobs[idx];
  }
  return null;
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
      if (res[0]) return res[0] as Application;
    } catch (err) {
      console.warn('Postgres create application failed, using memory store:', err);
    }
  }
  memApps.unshift(appData);
  const job = memJobs.find((j) => j.id === appData.job_id);
  if (job) {
    job.applicant_count = (job.applicant_count || 0) + 1;
  }
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
        if (res[0]) return res[0] as Application;
      }
    } catch (err) {
      console.warn('Postgres update app status failed, using memory store:', err);
    }
  }
  const app = memApps.find((a) => a.id === appId);
  if (app) {
    app.status = targetStatus;
    app.status_history = [...(app.status_history || []), historyEntry];
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
      if (res[0]) return res[0] as Application;
    } catch (err) {
      console.warn('Postgres update app notes failed, using memory store:', err);
    }
  }
  const app = memApps.find((a) => a.id === appId);
  if (app) {
    app.internal_notes = internalNotes;
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
      if (res[0]) return res[0] as FlagReport;
    } catch (err) {
      console.warn('Postgres create flag report failed, using memory store:', err);
    }
  }
  memFlags.unshift(report);
  return report;
}

export async function pgResolveFlagReport(id: string): Promise<FlagReport | null> {
  if (isPgAvailable()) {
    try {
      const res = await db.update(schema.flagReports).set({ status: 'resolved' }).where(eq(schema.flagReports.id, id)).returning();
      if (res[0]) return res[0] as FlagReport;
    } catch (err) {
      console.warn('Postgres resolve flag report failed, using memory store:', err);
    }
  }
  const rep = memFlags.find((r) => r.id === id);
  if (rep) rep.status = 'resolved';
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
      if (res[0]) return res[0] as ResumeDocument;
    } catch (err) {
      console.warn('Postgres create resume doc failed, using memory store:', err);
    }
  }
  memResumes[doc.id] = doc;
  return doc;
}

if (isPgAvailable()) {
  seedPgDatabase().catch((err) => {
    console.warn('[Cloud SQL] Automatic seeding skipped:', err);
  });
}
