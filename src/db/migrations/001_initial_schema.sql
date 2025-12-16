-- Maintainer Brief Database Schema
-- Run this via Supabase SQL editor or migration tool

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
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

CREATE INDEX idx_github_accounts_user_id ON github_accounts(user_id);

-- Connected repositories
CREATE TABLE IF NOT EXISTS repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id TEXT NOT NULL,
  full_name TEXT NOT NULL, -- owner/repo
  default_branch TEXT NOT NULL DEFAULT 'main',
  is_private BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, github_repo_id)
);

CREATE INDEX idx_repos_user_id ON repos(user_id);
CREATE INDEX idx_repos_status ON repos(status);

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

CREATE INDEX idx_analysis_jobs_repo_id ON analysis_jobs(repo_id);
CREATE INDEX idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_snapshot_hash ON analysis_jobs(github_snapshot_hash);
CREATE INDEX idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

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

CREATE INDEX idx_analysis_outputs_job_id ON analysis_outputs(job_id);
CREATE INDEX idx_analysis_outputs_repo_id ON analysis_outputs(repo_id);
CREATE INDEX idx_analysis_outputs_type ON analysis_outputs(type);
CREATE INDEX idx_analysis_outputs_created_at ON analysis_outputs(created_at DESC);

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

CREATE INDEX idx_export_requests_output_id ON export_requests(output_id);
CREATE INDEX idx_export_requests_status ON export_requests(status);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for repo_settings
CREATE TRIGGER update_repo_settings_updated_at
BEFORE UPDATE ON repo_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_requests ENABLE ROW LEVEL SECURITY;

-- Users: can only see their own record
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_insert_own ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- GitHub accounts: users can only see their own
CREATE POLICY github_accounts_select_own ON github_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY github_accounts_insert_own ON github_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY github_accounts_update_own ON github_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY github_accounts_delete_own ON github_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Repos: users can only see their own
CREATE POLICY repos_select_own ON repos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY repos_insert_own ON repos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY repos_update_own ON repos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY repos_delete_own ON repos
  FOR DELETE USING (auth.uid() = user_id);

-- Repo settings: users can only access settings for their repos
CREATE POLICY repo_settings_select_own ON repo_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repos WHERE repos.id = repo_settings.repo_id AND repos.user_id = auth.uid()
    )
  );

CREATE POLICY repo_settings_insert_own ON repo_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM repos WHERE repos.id = repo_settings.repo_id AND repos.user_id = auth.uid()
    )
  );

CREATE POLICY repo_settings_update_own ON repo_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM repos WHERE repos.id = repo_settings.repo_id AND repos.user_id = auth.uid()
    )
  );

-- Analysis jobs: users can only see their own jobs
CREATE POLICY analysis_jobs_select_own ON analysis_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY analysis_jobs_insert_own ON analysis_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY analysis_jobs_update_own ON analysis_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Analysis outputs: users can only see outputs for their repos
CREATE POLICY analysis_outputs_select_own ON analysis_outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repos WHERE repos.id = analysis_outputs.repo_id AND repos.user_id = auth.uid()
    )
  );

-- Export requests: users can only see exports for their outputs
CREATE POLICY export_requests_select_own ON export_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_outputs ao
      JOIN repos r ON r.id = ao.repo_id
      WHERE ao.id = export_requests.output_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY export_requests_insert_own ON export_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_outputs ao
      JOIN repos r ON r.id = ao.repo_id
      WHERE ao.id = export_requests.output_id AND r.user_id = auth.uid()
    )
  );

