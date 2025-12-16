import { z } from 'zod';

/**
 * Validates GitHub repository full name (owner/repo)
 */
export function validateRepoFullName(fullName: string): boolean {
  const pattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
  return pattern.test(fullName);
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

/**
 * Sanitizes user input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Zod schemas for API validation
 */
export const schemas = {
  // GitHub connection
  githubConnect: z.object({
    code: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
  }).refine(data => data.code || data.token, {
    message: 'Either code or token must be provided',
  }),

  // Create repo
  createRepo: z.object({
    full_name: z.string().min(1).refine(validateRepoFullName, {
      message: 'Invalid repository name format (expected: owner/repo)',
    }),
    github_repo_id: z.string().min(1),
    default_branch: z.string().min(1).default('main'),
    is_private: z.boolean().default(false),
  }),

  // Update repo settings
  updateSettings: z.object({
    branch: z.string().min(1).optional(),
    analysis_depth: z.enum(['fast', 'deep']).optional(),
    output_tone: z.enum(['concise', 'detailed']).optional(),
    ignore_paths: z.array(z.string()).optional(),
    schedule: z.enum(['manual', 'weekly', 'biweekly']).optional(),
    notify_email: z.boolean().optional(),
    notify_slack: z.boolean().optional(),
    slack_webhook_url: z.string().url().optional(),
  }),

  // Export request
  exportRequest: z.object({
    format: z.enum(['markdown', 'pdf', 'github_release']),
  }),

  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
};

