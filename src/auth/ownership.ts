import db from '../db/client';

/**
 * Helper to check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Resolves a repoId (either UUID or GitHub repo ID) to the database UUID
 * Returns null if repo not found or user doesn't own it
 */
export async function resolveRepoId(
  userId: string,
  repoId: string
): Promise<string | null> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8d3b0573-4207-40dd-b592-63e02b65dcc5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ownership.ts:resolveRepoId',message:'Resolving repoId',data:{userId,repoId,isValidUUID:isValidUUID(repoId)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  let result;
  if (isValidUUID(repoId)) {
    // Look up by database ID (UUID)
    result = await db.query(
      'SELECT id FROM repos WHERE id = $1 AND user_id = $2',
      [repoId, userId]
    );
  } else {
    // Look up by GitHub repo ID (numeric string)
    result = await db.query(
      'SELECT id FROM repos WHERE github_repo_id = $1 AND user_id = $2',
      [repoId, userId]
    );
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8d3b0573-4207-40dd-b592-63e02b65dcc5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ownership.ts:resolveRepoId',message:'Resolve result',data:{found:result.rows.length > 0,resolvedId:result.rows[0]?.id || null,lookupType:isValidUUID(repoId)?'uuid':'github_id'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Verifies user owns a repository
 */
export async function verifyRepoOwnership(
  userId: string,
  repoId: string
): Promise<boolean> {
  const resolvedId = await resolveRepoId(userId, repoId);
  return resolvedId !== null;
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


