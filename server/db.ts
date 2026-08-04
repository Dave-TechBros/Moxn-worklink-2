import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const STORE_PATH = IS_SERVERLESS
  ? path.join('/tmp', 'db_store.json')
  : path.join(process.cwd(), '.data', 'db_store.json');

// Pre-seeded Users
export const users: User[] = [
  {
    id: 'user-cand-1',
    email: 'sarah.chen@example.com',
    password: 'Password123!',
    name: 'Sarah Chen',
    role: 'candidate',
    created_at: '2026-01-15T10:00:00.000Z'
  },
  {
    id: 'user-cand-2',
    email: 'marcus.vance@example.com',
    password: 'Password123!',
    name: 'Marcus Vance',
    role: 'candidate',
    created_at: '2026-02-01T11:30:00.000Z'
  },
  {
    id: 'user-cand-3',
    email: 'elena.rodriguez@example.com',
    password: 'Password123!',
    name: 'Elena Rodriguez',
    role: 'candidate',
    created_at: '2026-03-10T09:15:00.000Z'
  },
  {
    id: 'user-emp-1',
    email: 'elena.rostova@techflow.io',
    password: 'Password123!',
    name: 'Elena Rostova',
    role: 'employer',
    company_id: 'comp-1',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    created_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'user-emp-2',
    email: 'david.miller@cloudscale.net',
    password: 'Password123!',
    name: 'David Miller',
    role: 'employer',
    company_id: 'comp-2',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    created_at: '2026-01-05T09:00:00.000Z'
  },
  {
    id: 'user-admin-1',
    email: 'admin.moderator@moxnworklink.com',
    password: 'AdminPassword123!',
    name: 'Platform Moderator',
    role: 'admin',
    admin_level: 'super_admin',
    status: 'active',
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

// Pre-seeded Candidate Profiles
export const candidateProfiles: Record<string, CandidateProfile> = {
  'user-cand-1': {
    user_id: 'user-cand-1',
    name: 'Sarah Chen',
    headline: 'Senior Fullstack Engineer | React, Node.js & Cloud Systems',
    location: 'San Francisco, CA (Hybrid / Remote)',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL', 'AWS', 'Distributed Systems'],
    resume_file_id: 'res-cand-1',
    resume_file_name: 'Sarah_Chen_Staff_Engineer_Resume.pdf',
    links: [
      { label: 'GitHub', url: 'https://github.com/sarahchen-dev' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/sarahchen' },
      { label: 'Portfolio', url: 'https://sarahchen.io' }
    ],
    bio: '8+ years of experience architecting high-throughput financial web platforms and real-time collaboration engines. Passionate about developer tooling, API safety, and reliable UX.',
    years_experience: 8,
    updated_at: '2026-07-20T14:22:00.000Z'
  },
  'user-cand-2': {
    user_id: 'user-cand-2',
    name: 'Marcus Vance',
    headline: 'Lead Product Designer | Design Systems & Complex Web Interfaces',
    location: 'New York, NY (Remote)',
    skills: ['Figma', 'Design Systems', 'UX Research', 'Prototyping', 'WCAG Accessibility', 'Tailwind CSS'],
    resume_file_id: 'res-cand-2',
    resume_file_name: 'Marcus_Vance_Design_Portfolio.pdf',
    links: [
      { label: 'Dribbble', url: 'https://dribbble.com/marcusvance' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/marcusvance' }
    ],
    bio: 'Product designer focused on turning dense domain workflows into serene, effortless user experiences. Led redesigns for two fintech scaleups.',
    years_experience: 6,
    updated_at: '2026-07-22T09:10:00.000Z'
  },
  'user-cand-3': {
    user_id: 'user-cand-3',
    name: 'Elena Rodriguez',
    headline: 'Staff Infrastructure & DevOps Lead | Kubernetes & Terraform',
    location: 'Austin, TX (Remote)',
    skills: ['Kubernetes', 'Docker', 'Terraform', 'Go', 'Prometheus', 'CI/CD Pipelines', 'GCP'],
    resume_file_id: 'res-cand-3',
    resume_file_name: 'Elena_Rodriguez_DevOps_Resume.pdf',
    links: [
      { label: 'GitHub', url: 'https://github.com/erodriguez-infra' }
    ],
    bio: 'DevOps engineer with a focus on zero-downtime deployments, SOC2 compliance infrastructure, and automated cloud cost optimization.',
    years_experience: 10,
    updated_at: '2026-07-25T11:45:00.000Z'
  }
};

// Pre-seeded Companies
export const companies: Company[] = [
  {
    id: 'comp-1',
    owner_user_id: 'user-emp-1',
    name: 'TechFlow Systems',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
    description: 'TechFlow builds next-generation real-time analytics engines and developer infrastructure for high-growth engineering teams.',
    website: 'https://techflow.io',
    status: 'active',
    industry: 'Enterprise Software & Cloud Infra',
    location: 'San Francisco, CA',
    created_at: '2026-01-02T10:00:00.000Z'
  },
  {
    id: 'comp-2',
    owner_user_id: 'user-emp-2',
    name: 'CloudScale Technologies',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=150',
    description: 'CloudScale provides unified telemetry and intelligent observability tools for microservice architectures.',
    website: 'https://cloudscale.net',
    status: 'active',
    industry: 'Observability & Security',
    location: 'Seattle, WA',
    created_at: '2026-01-05T12:00:00.000Z'
  },
  {
    id: 'comp-3',
    owner_user_id: 'user-emp-3',
    name: 'FinVault Protocol',
    logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=150',
    description: 'Institutional asset management and treasury automation software trusted by Fortune 500 treasury offices.',
    website: 'https://finvault.com',
    status: 'active',
    industry: 'Fintech & Banking Technology',
    location: 'New York, NY',
    created_at: '2026-01-10T09:00:00.000Z'
  },
  {
    id: 'comp-4',
    owner_user_id: 'user-emp-4',
    name: 'BioPulse AI',
    logo: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=150',
    description: 'Accelerating therapeutic discovery with precision computational biology models and clinical trials workflow tools.',
    website: 'https://biopulse.ai',
    status: 'active',
    industry: 'Healthtech & Biotechnology',
    location: 'Boston, MA',
    created_at: '2026-01-12T15:30:00.000Z'
  },
  {
    id: 'comp-5',
    owner_user_id: 'user-emp-5',
    name: 'QuantumCrypto Labs (Flagged)',
    logo: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&q=80&w=150',
    description: 'Unverified high-yield automated trading tokens platform.',
    website: 'https://quantumcrypto-suspect.io',
    status: 'active', // can be suspended by admin
    industry: 'Web3 & Tokens',
    location: 'Offshore / Unverified',
    created_at: '2026-07-20T08:00:00.000Z'
  }
];

// Pre-seeded Jobs
export const jobs: Job[] = [
  {
    id: 'job-101',
    company_id: 'comp-1',
    company_name: 'TechFlow Systems',
    company_logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
    company_status: 'active',
    title: 'Senior Staff Frontend Architect',
    description: `We are seeking a Staff Frontend Architect to lead the core web platform at TechFlow Systems. You will own the architecture of our high-volume analytics dashboard used by over 100,000 engineers daily.

### Responsibilities:
- Design resilient, low-latency micro-frontend architectures with React, TypeScript, and WebGL/D3.
- Establish strict design system tokens, WCAG 2.2 accessibility standards, and bundle performance budgets.
- Mentor senior engineers and collaborate directly with VP of Product on 12-month engineering roadmaps.
- Enforce strict typing, optimistic state updates, and robust offline fallback strategies.

### Requirements:
- 7+ years of experience with modern TypeScript and React performance profiling.
- Deep familiarity with WebSockets, state machine architecture, and client-side memory optimization.
- Track record of building complex, data-dense enterprise SaaS tools.`,
    requirements: [
      '7+ years experience with React and TypeScript',
      'Proven leadership in design system architecture',
      'Strong knowledge of state machines (XState or custom reducers)',
      'Experience with WebGL or high-throughput canvas rendering',
      'WCAG 2.2 Accessibility implementation experience'
    ],
    location: 'San Francisco, CA',
    location_type: 'Hybrid',
    employment_type: 'Full-time',
    salary_min: 185000,
    salary_max: 230000,
    salary_currency: 'USD',
    tags: ['React', 'TypeScript', 'Frontend Architecture', 'Design Systems', 'Performance'],
    status: 'published',
    created_at: '2026-07-15T10:00:00.000Z',
    applicant_count: 3
  },
  {
    id: 'job-102',
    company_id: 'comp-1',
    company_name: 'TechFlow Systems',
    company_logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
    company_status: 'active',
    title: 'Lead Distributed Systems Engineer',
    description: `Join TechFlow to lead our backend engine team. We process over 2.5 billion API requests per day across thousands of cloud nodes.

### Responsibilities:
- Architect zero-downtime distributed storage layers in Go and Rust.
- Optimize Raft consensus mechanisms and multi-region database replication.
- Partner with SREs to guarantee 99.999% availability SLAs across global regions.`,
    requirements: [
      '6+ years in Go or Rust distributed systems development',
      'Solid experience with PostgreSQL and distributed key-value stores',
      'Demonstrated expertise in distributed tracing and telemetry'
    ],
    location: 'San Francisco, CA',
    location_type: 'Remote',
    employment_type: 'Full-time',
    salary_min: 195000,
    salary_max: 245000,
    salary_currency: 'USD',
    tags: ['Go', 'Rust', 'Distributed Systems', 'PostgreSQL', 'Kubernetes'],
    status: 'published',
    created_at: '2026-07-18T14:30:00.000Z',
    applicant_count: 1
  },
  {
    id: 'job-103',
    company_id: 'comp-2',
    company_name: 'CloudScale Technologies',
    company_logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=150',
    company_status: 'active',
    title: 'Principal Product Designer',
    description: `CloudScale is looking for a Principal Product Designer to revolutionize how infrastructure engineers diagnose site outages and analyze log streams.

### Responsibilities:
- Create unified design systems for multi-tenant monitoring consoles.
- Conduct deep user research with DevOps leads and principal SREs.
- Prototype complex filtering, interactive flame graphs, and timeline navigation.`,
    requirements: [
      '5+ years leading UX/UI for technical or developer-facing products',
      'Mastery of Figma design components and token libraries',
      'Ability to translate complex technical metrics into serene visual dashboards'
    ],
    location: 'Seattle, WA',
    location_type: 'Remote',
    employment_type: 'Full-time',
    salary_min: 170000,
    salary_max: 210000,
    salary_currency: 'USD',
    tags: ['Product Design', 'Figma', 'UX Research', 'Design Systems', 'Developer Tools'],
    status: 'published',
    created_at: '2026-07-20T09:00:00.000Z',
    applicant_count: 2
  },
  {
    id: 'job-104',
    company_id: 'comp-3',
    company_name: 'FinVault Protocol',
    company_logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=150',
    company_status: 'active',
    title: 'Senior Fintech Security Engineer',
    description: `FinVault automates billions in daily corporate treasury operations. We require an uncompromising security engineer to lead application security audits, penetration testing, and zero-trust authentication policies.`,
    requirements: [
      '5+ years in application security and threat modeling in fintech',
      'Experience with SOC2 Type II, ISO 27001 compliance',
      'Strong programming capability in Python or TypeScript for automated scanning'
    ],
    location: 'New York, NY',
    location_type: 'Hybrid',
    employment_type: 'Full-time',
    salary_min: 180000,
    salary_max: 225000,
    salary_currency: 'USD',
    tags: ['Security', 'Fintech', 'SOC2', 'Penetration Testing', 'TypeScript'],
    status: 'published',
    created_at: '2026-07-21T11:20:00.000Z',
    applicant_count: 0
  },
  {
    id: 'job-105',
    company_id: 'comp-4',
    company_name: 'BioPulse AI',
    company_logo: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=150',
    company_status: 'active',
    title: 'Machine Learning Infrastructure Lead',
    description: `Build automated training pipelines and GPU cluster management for protein folding and bio-molecular simulation models.`,
    requirements: [
      '4+ years PyTorch/TensorFlow production deployment experience',
      'Knowledge of Ray, Slurm, or Kubernetes GPU acceleration',
      'M.S. or Ph.D. in Computer Science or related quantitative field preferred'
    ],
    location: 'Boston, MA',
    location_type: 'On-site',
    employment_type: 'Full-time',
    salary_min: 200000,
    salary_max: 260000,
    salary_currency: 'USD',
    tags: ['Machine Learning', 'Python', 'PyTorch', 'Bioinformatics', 'Kubernetes'],
    status: 'published',
    created_at: '2026-07-22T16:00:00.000Z',
    applicant_count: 0
  },
  {
    id: 'job-106',
    company_id: 'comp-5',
    company_name: 'QuantumCrypto Labs (Flagged)',
    company_logo: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&q=80&w=150',
    company_status: 'active',
    title: 'Guaranteed 1000x Yield Bot Developer',
    description: `Earn $500/hr by running unverified liquidity trading smart contracts. Guaranteed return! No experience needed.`,
    requirements: ['Send $50 deposit to start'],
    location: 'Remote',
    location_type: 'Remote',
    employment_type: 'Contract',
    salary_min: 250000,
    salary_max: 500000,
    salary_currency: 'USD',
    tags: ['Crypto', 'Tokens', 'High Yield'],
    status: 'published',
    created_at: '2026-07-24T18:00:00.000Z',
    applicant_count: 0
  }
];

// Pre-seeded Applications with Full Audit Trail Status History
export const applications: Application[] = [
  {
    id: 'app-201',
    job_id: 'job-101',
    candidate_id: 'user-cand-1',
    resume_file_id: 'res-cand-1',
    resume_file_name: 'Sarah_Chen_Staff_Engineer_Resume.pdf',
    cover_note: 'I have led web platform architecture for 8+ years, specializing in high-density data visualization and React state machine patterns. TechFlow\'s analytics engine aligns directly with my core domain expertise.',
    status: 'interview',
    status_history: [
      {
        id: 'hist-201-1',
        from_status: null,
        to_status: 'new',
        updated_by_user_id: 'user-cand-1',
        updated_by_name: 'Sarah Chen',
        timestamp: '2026-07-16T10:30:00.000Z',
        note: 'Application submitted by candidate with attached resume.'
      },
      {
        id: 'hist-201-2',
        from_status: 'new',
        to_status: 'reviewing',
        updated_by_user_id: 'user-emp-1',
        updated_by_name: 'Elena Rostova',
        timestamp: '2026-07-17T09:15:00.000Z',
        note: 'Candidate profile matches top 5% criteria. Forwarded to VP of Engineering.'
      },
      {
        id: 'hist-201-3',
        from_status: 'reviewing',
        to_status: 'interview',
        updated_by_user_id: 'user-emp-1',
        updated_by_name: 'Elena Rostova',
        timestamp: '2026-07-19T14:00:00.000Z',
        note: 'Technical screen scheduled with Staff Architecture panel for July 28.'
      }
    ],
    created_at: '2026-07-16T10:30:00.000Z',
    internal_notes: 'Strong candidate. Outstanding open-source work on custom state machine framework.',
    candidate_name: 'Sarah Chen',
    candidate_headline: 'Senior Fullstack Engineer | React, Node.js & Cloud Systems',
    candidate_email: 'sarah.chen@example.com',
    job_title: 'Senior Staff Frontend Architect',
    company_name: 'TechFlow Systems',
    company_id: 'comp-1',
    location: 'San Francisco, CA',
    salary_range_formatted: '$185k - $230k'
  },
  {
    id: 'app-202',
    job_id: 'job-103',
    candidate_id: 'user-cand-2',
    resume_file_id: 'res-cand-2',
    resume_file_name: 'Marcus_Vance_Design_Portfolio.pdf',
    cover_note: 'I design complex enterprise tools that simplify telemetry and observability workflows. I would love to discuss how CloudScale\'s design tokens can be elevated.',
    status: 'reviewing',
    status_history: [
      {
        id: 'hist-202-1',
        from_status: null,
        to_status: 'new',
        updated_by_user_id: 'user-cand-2',
        updated_by_name: 'Marcus Vance',
        timestamp: '2026-07-21T12:00:00.000Z',
        note: 'Application submitted.'
      },
      {
        id: 'hist-202-2',
        from_status: 'new',
        to_status: 'reviewing',
        updated_by_user_id: 'user-emp-2',
        updated_by_name: 'David Miller',
        timestamp: '2026-07-22T08:30:00.000Z',
        note: 'Reviewing design portfolio link.'
      }
    ],
    created_at: '2026-07-21T12:00:00.000Z',
    internal_notes: 'Portfolio shows great taste and accessibility rigor.',
    candidate_name: 'Marcus Vance',
    candidate_headline: 'Lead Product Designer | Design Systems & Complex Web Interfaces',
    candidate_email: 'marcus.vance@example.com',
    job_title: 'Principal Product Designer',
    company_name: 'CloudScale Technologies',
    company_id: 'comp-2',
    location: 'Seattle, WA',
    salary_range_formatted: '$170k - $210k'
  },
  {
    id: 'app-203',
    job_id: 'job-101',
    candidate_id: 'user-cand-2',
    resume_file_id: 'res-cand-2',
    resume_file_name: 'Marcus_Vance_Design_Portfolio.pdf',
    cover_note: 'Applying for the design aspect of TechFlow\'s frontend architecture leadership.',
    status: 'new',
    status_history: [
      {
        id: 'hist-203-1',
        from_status: null,
        to_status: 'new',
        updated_by_user_id: 'user-cand-2',
        updated_by_name: 'Marcus Vance',
        timestamp: '2026-07-23T15:20:00.000Z',
        note: 'Application submitted.'
      }
    ],
    created_at: '2026-07-23T15:20:00.000Z',
    candidate_name: 'Marcus Vance',
    candidate_headline: 'Lead Product Designer | Design Systems & Complex Web Interfaces',
    candidate_email: 'marcus.vance@example.com',
    job_title: 'Senior Staff Frontend Architect',
    company_name: 'TechFlow Systems',
    company_id: 'comp-1',
    location: 'San Francisco, CA',
    salary_range_formatted: '$185k - $230k'
  }
];

// Pre-seeded Flag/Report Items
export const flagReports: FlagReport[] = [
  {
    id: 'report-301',
    target_type: 'job',
    target_id: 'job-106',
    target_title: 'Guaranteed 1000x Yield Bot Developer',
    reason: 'Spam & Financial Scam',
    details: 'Job post asks for $50 deposit and promises guaranteed crypto yields. Violates platform trust guidelines.',
    status: 'open',
    reported_by_user_id: 'user-cand-1',
    reported_by_name: 'Sarah Chen',
    created_at: '2026-07-25T09:00:00.000Z'
  },
  {
    id: 'report-302',
    target_type: 'company',
    target_id: 'comp-5',
    target_title: 'QuantumCrypto Labs (Flagged)',
    reason: 'Unverified Entity / Suspicious Domain',
    details: 'Company description contains fraudulent promises and invalid website links.',
    status: 'open',
    reported_by_user_id: 'user-cand-2',
    reported_by_name: 'Marcus Vance',
    created_at: '2026-07-25T10:15:00.000Z'
  }
];

// Pre-seeded Resumes
export const resumeDocuments: Record<string, ResumeDocument> = {
  'res-cand-1': {
    id: 'res-cand-1',
    user_id: 'user-cand-1',
    filename: 'Sarah_Chen_Staff_Engineer_Resume.pdf',
    file_size: 245000,
    content_type: 'application/pdf',
    data_url: 'data:application/pdf;base64,JVBERi0xLjQKJ...[PDF Document Preview Content: Sarah Chen - Staff Engineer]',
    uploaded_at: '2026-07-15T08:00:00.000Z'
  },
  'res-cand-2': {
    id: 'res-cand-2',
    user_id: 'user-cand-2',
    filename: 'Marcus_Vance_Design_Portfolio.pdf',
    file_size: 380000,
    content_type: 'application/pdf',
    data_url: 'data:application/pdf;base64,JVBERi0xLjQKJ...[PDF Document Preview Content: Marcus Vance - Lead Product Designer]',
    uploaded_at: '2026-07-20T10:00:00.000Z'
  }
};

// Admin platform collections
export const notifications: PlatformNotification[] = [];
export const auditLogs: AuditLogEntry[] = [];

export const defaultSettings: PlatformSettings = {
  platform_name: 'Moxn Worklink',
  platform_tagline: 'Career Marketplace',
  registration_enabled: true,
  job_approval_required: true,
  maintenance_mode: false,
  email_notifications_enabled: true,
  contact_email: 'support@moxnworklink.com',
  max_resume_size_mb: 10,
  announcement: '',
  updated_at: new Date().toISOString()
};

export let settings: PlatformSettings = { ...defaultSettings };

export function updateSettings(patch: Partial<PlatformSettings>): PlatformSettings {
  settings = {
    ...settings,
    ...patch,
    updated_at: new Date().toISOString()
  };
  return settings;
}

export function getSettings(): PlatformSettings {
  return settings;
}

// Application State Machine Validator Function
export function validateStateTransition(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus,
  force: boolean = false
): { valid: boolean; message: string } {
  if (currentStatus === targetStatus) {
    return { valid: true, message: `Application is already in status '${targetStatus}'.` };
  }

  if (force) {
    return { valid: true, message: `Transition forced by authorized manager.` };
  }

  // Allowed transitions map
  const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    'new': ['reviewing', 'rejected'],
    'reviewing': ['interview', 'rejected'],
    'interview': ['offer', 'rejected'],
    'offer': ['rejected'],
    'rejected': ['reviewing'] // Re-opening evaluation
  };

  const validNext = allowedTransitions[currentStatus] || [];
  if (validNext.includes(targetStatus)) {
    return { valid: true, message: `Valid transition from '${currentStatus}' to '${targetStatus}'.` };
  }

  return {
    valid: false,
    message: `Invalid state transition: Cannot move directly from '${currentStatus}' to '${targetStatus}'. Expected steps in sequence: new → reviewing → interview → offer (or rejected).`
  };
}

// -------------------------------------------------------------
// JSON FILE PERSISTENCE ENGINE
// -------------------------------------------------------------
export function saveStore(): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = {
      users,
      candidateProfiles,
      companies,
      jobs,
      applications,
      flagReports,
      resumeDocuments,
      notifications,
      auditLogs,
      settings
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store to disk:', err);
  }
}

let saveTimer: NodeJS.Timeout | null = null;
let saveScheduled = false;

// Debounced persistence: coalesces rapid mutations into a single disk write.
// Falls back to a synchronous write on process exit so data survives restarts.
export function scheduleStoreSave(): void {
  saveScheduled = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveScheduled = false;
    saveStore();
  }, 300);
}

export function flushStore(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveScheduled = false;
  saveStore();
}

process.on('exit', () => {
  if (saveTimer || saveScheduled) {
    saveStore();
  }
});

export function loadStore(): void {
  try {
    let sourcePath = STORE_PATH;
    if (!fs.existsSync(sourcePath)) {
      const fallbackPaths = [
        path.join(process.cwd(), '.data', 'db_store.json'),
        path.join(process.cwd(), '..', '.data', 'db_store.json')
      ];
      for (const p of fallbackPaths) {
        if (fs.existsSync(p)) {
          sourcePath = p;
          break;
        }
      }
    }

    if (fs.existsSync(sourcePath)) {
      const raw = fs.readFileSync(sourcePath, 'utf-8');
      const data = JSON.parse(raw);

      if (Array.isArray(data.users) && data.users.length > 0) {
        users.length = 0;
        users.push(...data.users);
      }
      if (data.candidateProfiles && typeof data.candidateProfiles === 'object' && Object.keys(data.candidateProfiles).length > 0) {
        for (const k of Object.keys(candidateProfiles)) delete candidateProfiles[k];
        Object.assign(candidateProfiles, data.candidateProfiles);
      }
      if (Array.isArray(data.companies) && data.companies.length > 0) {
        companies.length = 0;
        companies.push(...data.companies);
      }
      if (Array.isArray(data.jobs) && data.jobs.length > 0) {
        jobs.length = 0;
        jobs.push(...data.jobs);
      }
      if (Array.isArray(data.applications) && data.applications.length > 0) {
        applications.length = 0;
        applications.push(...data.applications);
      }
      if (Array.isArray(data.flagReports) && data.flagReports.length > 0) {
        flagReports.length = 0;
        flagReports.push(...data.flagReports);
      }
      if (data.resumeDocuments && typeof data.resumeDocuments === 'object' && Object.keys(data.resumeDocuments).length > 0) {
        for (const k of Object.keys(resumeDocuments)) delete resumeDocuments[k];
        Object.assign(resumeDocuments, data.resumeDocuments);
      }
      if (Array.isArray(data.notifications)) {
        notifications.length = 0;
        notifications.push(...data.notifications);
      }
      if (Array.isArray(data.auditLogs)) {
        auditLogs.length = 0;
        auditLogs.push(...data.auditLogs);
      }
      if (data.settings && typeof data.settings === 'object') {
        settings = { ...defaultSettings, ...data.settings };
      }
      console.log(`[DB Engine] Persistent store loaded successfully from ${sourcePath}. Active users: ${users.length}, Jobs: ${jobs.length}`);
      if (sourcePath !== STORE_PATH) {
        saveStore();
      }
    } else {
      saveStore();
    }
  } catch (err) {
    console.error('Failed to load store from disk:', err);
  }
}

// Automatically load store on startup
loadStore();
