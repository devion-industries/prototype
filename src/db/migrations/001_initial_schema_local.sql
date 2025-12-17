-- Maintainer Brief Database Schema (Local Development Version)
-- Simplified schema without Supabase auth dependencies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (standalone for local development)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- GitHub accounts (OAuth connections)
CREATE TABLE IF NOT EXISTS github_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_user_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, github_user_id)
);

CREATE INDEX IF NOT EXISTS idx_github_accounts_user_id ON github_accounts(user_id);

-- Connected repositories
CREATE TABLE IF NOT EXISTS repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  is_private BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, github_repo_id)
);

CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repos(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_status ON repos(status);

-- Repository settings
CREATE TABLE IF NOT EXISTS repo_settings (
  repo_id UUID PRIMARY KEY REFERENCES repos(id) ON DELETE CASCADE,
  branch TEXT NOT NULL DEFAULT 'main',
  analysis_depth TEXT NOT NULL DEFAULT 'fast' CHECK (analysis_depth IN ('fast', 'deep')),
  output_tone TEXT NOT NULL DEFAULT 'concise' CHECK (output_tone IN ('concise', 'detailed')),
  ignore_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
  schedule TEXT NOT NULL DEFAULT 'manual' CHECK (schedule IN ('manual', 'weekly', 'biweekly')),
  notify_email BOOLEAN NOT NULL DEFAULT false,
  notify_slack BOOLEAN NOT NULL DEFAULT false,
  slack_webhook_url_encrypted TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Analysis jobs
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'schedule')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  github_snapshot_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_repo_id ON analysis_jobs(repo_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_snapshot_hash ON analysis_jobs(github_snapshot_hash);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

-- Analysis outputs
CREATE TABLE IF NOT EXISTS analysis_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('maintainer_brief', 'contributor_quickstart', 'release_summary', 'good_first_issues')),
  content_markdown TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_outputs_job_id ON analysis_outputs(job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_outputs_repo_id ON analysis_outputs(repo_id);
CREATE INDEX IF NOT EXISTS idx_analysis_outputs_type ON analysis_outputs(type);
CREATE INDEX IF NOT EXISTS idx_analysis_outputs_created_at ON analysis_outputs(created_at DESC);

-- Export requests
CREATE TABLE IF NOT EXISTS export_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  output_id UUID NOT NULL REFERENCES analysis_outputs(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('markdown', 'pdf', 'github_release')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  file_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_requests_output_id ON export_requests(output_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_status ON export_requests(status);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for repo_settings
DROP TRIGGER IF EXISTS update_repo_settings_updated_at ON repo_settings;
CREATE TRIGGER update_repo_settings_updated_at
BEFORE UPDATE ON repo_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert a test user for local development
INSERT INTO users (id, email) 
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@maintainerbrief.local')
ON CONFLICT (email) DO NOTHING;
