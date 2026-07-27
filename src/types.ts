export type UserRole = 'candidate' | 'employer' | 'admin';

export type ApplicationStatus = 'new' | 'reviewing' | 'interview' | 'offer' | 'rejected';

export type CompanyStatus = 'active' | 'suspended';

export type JobStatus = 'draft' | 'published' | 'closed';

export type LocationType = 'Remote' | 'Hybrid' | 'On-site';

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  company_id?: string;
  created_at: string;
}

export interface CandidateProfile {
  user_id: string;
  name: string;
  avatar?: string;
  headline: string;
  location: string;
  skills: string[];
  resume_file_id?: string;
  resume_file_name?: string;
  links: { label: string; url: string }[];
  bio: string;
  years_experience?: number;
  updated_at: string;
}

export interface Company {
  id: string;
  owner_user_id: string;
  name: string;
  logo: string;
  description: string;
  website: string;
  status: CompanyStatus;
  industry: string;
  location: string;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  company_name: string;
  company_logo?: string;
  company_status?: CompanyStatus;
  title: string;
  description: string;
  requirements: string[];
  location: string;
  location_type: LocationType;
  employment_type: EmploymentType;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  tags: string[];
  status: JobStatus;
  created_at: string;
  applicant_count?: number;
}

export interface StatusHistoryItem {
  id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  updated_by_user_id: string;
  updated_by_name: string;
  timestamp: string;
  note?: string;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_file_id?: string;
  resume_file_name?: string;
  cover_note: string;
  status: ApplicationStatus;
  status_history: StatusHistoryItem[];
  created_at: string;
  internal_notes?: string;
  
  // Denormalized details for quick rendering
  candidate_name: string;
  candidate_headline: string;
  candidate_email: string;
  job_title: string;
  company_name: string;
  company_id: string;
  location?: string;
  salary_range_formatted?: string;
}

export interface FlagReport {
  id: string;
  target_type: 'job' | 'company';
  target_id: string;
  target_title: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved';
  reported_by_user_id: string;
  reported_by_name: string;
  created_at: string;
}

export interface ResumeDocument {
  id: string;
  user_id: string;
  filename: string;
  file_size: number; // in bytes
  content_type: string;
  data_url: string; // base64 or text preview
  uploaded_at: string;
}

export interface JobFilters {
  search: string;
  location: string;
  employment_type: string;
  location_type: string;
  salary_min: number;
  tags: string[];
  company_id?: string;
}

export interface ApplicationTransitionRequest {
  to_status: ApplicationStatus;
  note?: string;
  force?: boolean;
}
