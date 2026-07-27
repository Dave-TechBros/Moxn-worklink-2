import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Using string/UID as primary key
  email: text('email').notNull(),
  password: text('password'),
  name: text('name').notNull(),
  role: text('role').notNull().default('candidate'),
  avatar: text('avatar'),
  company_id: text('company_id'),
  created_at: text('created_at').notNull(),
});

export const candidateProfiles = pgTable('candidate_profiles', {
  user_id: text('user_id').primaryKey().references(() => users.id),
  name: text('name').notNull(),
  avatar: text('avatar'),
  headline: text('headline').notNull().default(''),
  location: text('location').notNull().default(''),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  resume_file_id: text('resume_file_id'),
  resume_file_name: text('resume_file_name'),
  links: jsonb('links').$type<{ label: string; url: string }[]>().notNull().default([]),
  bio: text('bio').notNull().default(''),
  years_experience: integer('years_experience'),
  updated_at: text('updated_at').notNull(),
});

export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  owner_user_id: text('owner_user_id').notNull(),
  name: text('name').notNull(),
  logo: text('logo').notNull(),
  description: text('description').notNull(),
  website: text('website').notNull(),
  status: text('status').notNull().default('active'),
  industry: text('industry').notNull(),
  location: text('location').notNull(),
  created_at: text('created_at').notNull(),
});

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  company_id: text('company_id').notNull().references(() => companies.id),
  company_name: text('company_name').notNull(),
  company_logo: text('company_logo'),
  company_status: text('company_status'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  requirements: jsonb('requirements').$type<string[]>().notNull().default([]),
  location: text('location').notNull(),
  location_type: text('location_type').notNull(),
  employment_type: text('employment_type').notNull(),
  salary_min: integer('salary_min').notNull(),
  salary_max: integer('salary_max').notNull(),
  salary_currency: text('salary_currency').notNull().default('USD'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  status: text('status').notNull().default('published'),
  created_at: text('created_at').notNull(),
  applicant_count: integer('applicant_count').notNull().default(0),
});

export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id),
  candidate_id: text('candidate_id').notNull(),
  resume_file_id: text('resume_file_id'),
  resume_file_name: text('resume_file_name'),
  cover_note: text('cover_note').notNull().default(''),
  status: text('status').notNull().default('new'),
  status_history: jsonb('status_history').$type<any[]>().notNull().default([]),
  created_at: text('created_at').notNull(),
  internal_notes: text('internal_notes'),
  candidate_name: text('candidate_name').notNull(),
  candidate_headline: text('candidate_headline').notNull().default(''),
  candidate_email: text('candidate_email').notNull(),
  job_title: text('job_title').notNull(),
  company_name: text('company_name').notNull(),
  company_id: text('company_id').notNull(),
  location: text('location'),
  salary_range_formatted: text('salary_range_formatted'),
});

export const flagReports = pgTable('flag_reports', {
  id: text('id').primaryKey(),
  target_type: text('target_type').notNull(),
  target_id: text('target_id').notNull(),
  target_title: text('target_title').notNull(),
  reason: text('reason').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull().default('open'),
  reported_by_user_id: text('reported_by_user_id').notNull(),
  reported_by_name: text('reported_by_name').notNull(),
  created_at: text('created_at').notNull(),
});

export const resumeDocuments = pgTable('resume_documents', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  filename: text('filename').notNull(),
  file_size: integer('file_size').notNull(),
  content_type: text('content_type').notNull(),
  data_url: text('data_url').notNull(),
  uploaded_at: text('uploaded_at').notNull(),
});
