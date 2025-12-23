-- Migration: Add installation_id for GitHub App
-- This allows storing GitHub App installation ID instead of OAuth tokens

-- Add installation_id column to github_accounts
ALTER TABLE github_accounts 
ADD COLUMN IF NOT EXISTS installation_id BIGINT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_github_accounts_installation_id 
ON github_accounts(installation_id);

-- Make access_token_encrypted optional (for migration from OAuth to GitHub App)
ALTER TABLE github_accounts 
ALTER COLUMN access_token_encrypted DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN github_accounts.installation_id IS 'GitHub App installation ID for this user';





