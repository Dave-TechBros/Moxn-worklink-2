import { db, schema } from '../src/db/index.ts';
import { eq, and, desc, like, or } from 'drizzle-orm';
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
import { users as seedUsers, candidateProfiles as seedProfiles, companies as seedCompanies, jobs as seedJobs, applications as seedApps, flagReports as seedFlags, resumeDocuments as seedResumes } from './db.js';

// -------------------------------------------------------------
// SEEDING FUNCTION
// -------------------------------------------------------------
export async function seedPgDatabase() {
  try {
    const existingUsers = await db.select().from(schema.users).limit(1);
    if (existingUsers.length === 0) {
      console.log('[Cloud SQL] Seeding initial database records...');

      // Seed Users
      for (const u of seedUsers) {
        await db.insert(schema.users).values(u).onConflictDoNothing();
      }

      // Seed Candidate Profiles
      for (const p of Object.values(seedProfiles)) {
        await db.insert(schema.candidateProfiles).values(p).onConflictDoNothing();
      }

      // Seed Companies
      for (const c of seedCompanies) {
        await db.insert(schema.companies).values(c).onConflictDoNothing();
      }

      // Seed Jobs
      for (const j of seedJobs) {
        await db.insert(schema.jobs).values(j).onConflictDoNothing();
      }

      // Seed Applications
      for (const a of seedApps) {
        await db.insert(schema.applications).values(a).onConflictDoNothing();
      }

      // Seed Flag Reports
      for (const f of seedFlags) {
        await db.insert(schema.flagReports).values(f).onConflictDoNothing();
      }

      // Seed Resume Documents
      for (const r of Object.values(seedResumes)) {
        await db.insert(schema.resumeDocuments).values(r).onConflictDoNothing();
      }

      console.log('[Cloud SQL] Initial database seeding completed successfully.');
    }
  } catch (err) {
    console.error('[Cloud SQL] Database seeding failed:', err);
  }
}

// -------------------------------------------------------------
// USER HELPERS
// -------------------------------------------------------------
export async function pgGetUserById(id: string): Promise<User | null> {
  try {
    const res = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return (res[0] as User) || null;
  } catch (err) {
    console.error('pgGetUserById failed:', err);
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function pgGetUserByEmail(email: string): Promise<User | null> {
  try {
    const res = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);
    return (res[0] as User) || null;
  } catch (err) {
    console.error('pgGetUserByEmail failed:', err);
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function pgCreateUser(user: User): Promise<User> {
  try {
    const res = await db.insert(schema.users).values({
      ...user,
      email: user.email.toLowerCase().trim()
    }).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        email: user.email.toLowerCase().trim(),
        name: user.name,
        role: user.role,
        avatar: user.avatar || null,
        company_id: user.company_id || null
      }
    }).returning();
    return res[0] as User;
  } catch (err) {
    console.error('pgCreateUser failed:', err);
    throw new Error('Database insertion failed.', { cause: err });
  }
}

// -------------------------------------------------------------
// CANDIDATE PROFILE HELPERS
// -------------------------------------------------------------
export async function pgGetCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  try {
    const res = await db.select().from(schema.candidateProfiles).where(eq(schema.candidateProfiles.user_id, userId)).limit(1);
    return (res[0] as CandidateProfile) || null;
  } catch (err) {
    console.error('pgGetCandidateProfile failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgUpsertCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
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
    return res[0] as CandidateProfile;
  } catch (err) {
    console.error('pgUpsertCandidateProfile failed:', err);
    throw new Error('Database operation failed.', { cause: err });
  }
}

// -------------------------------------------------------------
// COMPANY HELPERS
// -------------------------------------------------------------
export async function pgGetCompanies(): Promise<Company[]> {
  try {
    return (await db.select().from(schema.companies)) as Company[];
  } catch (err) {
    console.error('pgGetCompanies failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgGetCompanyById(id: string): Promise<Company | null> {
  try {
    const res = await db.select().from(schema.companies).where(eq(schema.companies.id, id)).limit(1);
    return (res[0] as Company) || null;
  } catch (err) {
    console.error('pgGetCompanyById failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgGetCompanyByOwnerUserId(ownerUserId: string): Promise<Company | null> {
  try {
    const res = await db.select().from(schema.companies).where(eq(schema.companies.owner_user_id, ownerUserId)).limit(1);
    return (res[0] as Company) || null;
  } catch (err) {
    console.error('pgGetCompanyByOwnerUserId failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgCreateCompany(company: Company): Promise<Company> {
  try {
    const res = await db.insert(schema.companies).values(company).returning();
    return res[0] as Company;
  } catch (err) {
    console.error('pgCreateCompany failed:', err);
    throw new Error('Database insertion failed.', { cause: err });
  }
}

export async function pgUpdateCompanyStatus(companyId: string, status: 'active' | 'suspended'): Promise<Company | null> {
  try {
    const res = await db.update(schema.companies).set({ status }).where(eq(schema.companies.id, companyId)).returning();

    // Also sync jobs status if suspended
    const allJobs = await db.select().from(schema.jobs).where(eq(schema.jobs.company_id, companyId));
    for (const job of allJobs) {
      await db.update(schema.jobs).set({ company_status: status }).where(eq(schema.jobs.id, job.id));
    }

    return (res[0] as Company) || null;
  } catch (err) {
    console.error('pgUpdateCompanyStatus failed:', err);
    throw new Error('Database update failed.', { cause: err });
  }
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
  try {
    let allJobs = (await db.select().from(schema.jobs).orderBy(desc(schema.jobs.created_at))) as Job[];

    // Fetch associated companies to attach active status
    const allCompanies = await db.select().from(schema.companies);
    const companyMap = new Map(allCompanies.map((c) => [c.id, c]));

    let filtered: Job[] = allJobs.map((j) => {
      const comp = companyMap.get(j.company_id);
      return {
        ...j,
        company_status: (comp ? comp.status : j.company_status || 'active') as 'active' | 'suspended'
      };
    });

    if (params.company_id) {
      filtered = filtered.filter((j) => j.company_id === params.company_id);
    }

    if (params.status) {
      filtered = filtered.filter((j) => j.status === params.status);
    } else {
      // Default to published jobs for general listing unless employer/admin requests specifically
      // We keep published jobs unless company is suspended
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
  } catch (err) {
    console.error('pgGetJobs failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgGetJobById(id: string): Promise<Job | null> {
  try {
    const res = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).limit(1);
    if (!res[0]) return null;

    const job = res[0] as Job;
    const compRes = await db.select().from(schema.companies).where(eq(schema.companies.id, job.company_id)).limit(1);
    if (compRes[0]) {
      job.company_status = compRes[0].status as any;
    }
    return job;
  } catch (err) {
    console.error('pgGetJobById failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgCreateJob(job: Job): Promise<Job> {
  try {
    const res = await db.insert(schema.jobs).values(job).returning();
    return res[0] as Job;
  } catch (err) {
    console.error('pgCreateJob failed:', err);
    throw new Error('Database insertion failed.', { cause: err });
  }
}

export async function pgUpdateJob(jobId: string, jobData: Partial<Job>): Promise<Job | null> {
  try {
    const res = await db.update(schema.jobs).set(jobData).where(eq(schema.jobs.id, jobId)).returning();
    return (res[0] as Job) || null;
  } catch (err) {
    console.error('pgUpdateJob failed:', err);
    throw new Error('Database update failed.', { cause: err });
  }
}

// -------------------------------------------------------------
// APPLICATION HELPERS
// -------------------------------------------------------------
export async function pgGetApplications(params: {
  candidate_id?: string;
  company_id?: string;
  job_id?: string;
}): Promise<Application[]> {
  try {
    let allApps = (await db.select().from(schema.applications).orderBy(desc(schema.applications.created_at))) as Application[];

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
  } catch (err) {
    console.error('pgGetApplications failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgGetApplicationById(id: string): Promise<Application | null> {
  try {
    const res = await db.select().from(schema.applications).where(eq(schema.applications.id, id)).limit(1);
    return (res[0] as Application) || null;
  } catch (err) {
    console.error('pgGetApplicationById failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgCreateApplication(appData: Application): Promise<Application> {
  try {
    const res = await db.insert(schema.applications).values(appData).returning();

    // Increment applicant count on job
    const job = await pgGetJobById(appData.job_id);
    if (job) {
      await db.update(schema.jobs).set({ applicant_count: (job.applicant_count || 0) + 1 }).where(eq(schema.jobs.id, job.id));
    }

    return res[0] as Application;
  } catch (err) {
    console.error('pgCreateApplication failed:', err);
    throw new Error('Database insertion failed.', { cause: err });
  }
}

export async function pgUpdateApplicationStatus(
  appId: string,
  targetStatus: ApplicationStatus,
  historyEntry: StatusHistoryItem
): Promise<Application | null> {
  try {
    const existing = await pgGetApplicationById(appId);
    if (!existing) return null;

    const newHistory = [...(existing.status_history || []), historyEntry];

    const res = await db
      .update(schema.applications)
      .set({
        status: targetStatus,
        status_history: newHistory
      })
      .where(eq(schema.applications.id, appId))
      .returning();

    return (res[0] as Application) || null;
  } catch (err) {
    console.error('pgUpdateApplicationStatus failed:', err);
    throw new Error('Database update failed.', { cause: err });
  }
}

export async function pgUpdateApplicationNotes(appId: string, internalNotes: string): Promise<Application | null> {
  try {
    const res = await db
      .update(schema.applications)
      .set({ internal_notes: internalNotes })
      .where(eq(schema.applications.id, appId))
      .returning();
    return (res[0] as Application) || null;
  } catch (err) {
    console.error('pgUpdateApplicationNotes failed:', err);
    throw new Error('Database update failed.', { cause: err });
  }
}

// -------------------------------------------------------------
// FLAG REPORT HELPERS
// -------------------------------------------------------------
export async function pgGetFlagReports(): Promise<FlagReport[]> {
  try {
    return (await db.select().from(schema.flagReports).orderBy(desc(schema.flagReports.created_at))) as FlagReport[];
  } catch (err) {
    console.error('pgGetFlagReports failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgCreateFlagReport(report: FlagReport): Promise<FlagReport> {
  try {
    const res = await db.insert(schema.flagReports).values(report).returning();
    return res[0] as FlagReport;
  } catch (err) {
    console.error('pgCreateFlagReport failed:', err);
    throw new Error('Database insertion failed.', { cause: err });
  }
}

export async function pgResolveFlagReport(id: string): Promise<FlagReport | null> {
  try {
    const res = await db.update(schema.flagReports).set({ status: 'resolved' }).where(eq(schema.flagReports.id, id)).returning();
    return (res[0] as FlagReport) || null;
  } catch (err) {
    console.error('pgResolveFlagReport failed:', err);
    throw new Error('Database update failed.', { cause: err });
  }
}

// -------------------------------------------------------------
// RESUME DOCUMENT HELPERS
// -------------------------------------------------------------
export async function pgGetResumeDocument(id: string): Promise<ResumeDocument | null> {
  try {
    const res = await db.select().from(schema.resumeDocuments).where(eq(schema.resumeDocuments.id, id)).limit(1);
    return (res[0] as ResumeDocument) || null;
  } catch (err) {
    console.error('pgGetResumeDocument failed:', err);
    throw new Error('Database query failed.', { cause: err });
  }
}

export async function pgCreateResumeDocument(doc: ResumeDocument): Promise<ResumeDocument> {
  try {
    const res = await db.insert(schema.resumeDocuments).values(doc).returning();
    return res[0] as ResumeDocument;
  } catch (err) {
    console.error('pgCreateResumeDocument failed:', err);
    throw new Error('Database insertion failed.', { cause: err });
  }
}

// Run initial seed on module load
seedPgDatabase();
