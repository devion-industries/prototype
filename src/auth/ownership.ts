import db from '../db/client';

/**
 * Verifies user owns a repository
 */
export async function verifyRepoOwnership(
  userId: string,
  repoId: string
): Promise<boolean> {
  const result = await db.query(
    'SELECT id FROM repos WHERE id = $1 AND user_id = $2',
    [repoId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Verifies user owns a job
 */
export async function verifyJobOwnership(
  userId: string,
  jobId: string
): Promise<boolean> {
  const result = await db.query(
    'SELECT id FROM analysis_jobs WHERE id = $1 AND user_id = $2',
    [jobId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Verifies user owns an output (via repo)
 */
export async function verifyOutputOwnership(
  userId: string,
  outputId: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT ao.id FROM analysis_outputs ao
     JOIN repos r ON r.id = ao.repo_id
     WHERE ao.id = $1 AND r.user_id = $2`,
    [outputId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Gets repo ID from various resource IDs with ownership check
 */
export async function getRepoIdWithOwnership(
  userId: string,
  resourceId: string,
  resourceType: 'job' | 'output'
): Promise<string | null> {
  let query: string;

  if (resourceType === 'job') {
    query = `SELECT repo_id FROM analysis_jobs WHERE id = $1 AND user_id = $2`;
  } else {
    query = `SELECT ao.repo_id FROM analysis_outputs ao
             JOIN repos r ON r.id = ao.repo_id
             WHERE ao.id = $1 AND r.user_id = $2`;
  }

  const result = await db.query(query, [resourceId, userId]);
  return result.rows.length > 0 ? result.rows[0].repo_id : null;
}


