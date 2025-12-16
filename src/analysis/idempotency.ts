import { hashString } from '../utils/encryption';
import db from '../db/client';
import config from '../config';

/**
 * Generates idempotency hash for a repository analysis
 */
export function generateSnapshotHash(
  repoId: string,
  branch: string,
  latestCommitSha: string,
  depth: string
): string {
  const input = `${repoId}:${branch}:${latestCommitSha}:${depth}`;
  return hashString(input);
}

/**
 * Checks if a recent job with same snapshot exists
 * Returns existing job ID if found, null otherwise
 */
export async function findRecentJob(
  repoId: string,
  snapshotHash: string
): Promise<string | null> {
  const windowHours = config.IDEMPOTENCY_WINDOW_HOURS;

  const result = await db.query(
    `SELECT id FROM analysis_jobs
     WHERE repo_id = $1
       AND github_snapshot_hash = $2
       AND status = 'succeeded'
       AND created_at > NOW() - INTERVAL '${windowHours} hours'
     ORDER BY created_at DESC
     LIMIT 1`,
    [repoId, snapshotHash]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Creates a new analysis job record
 */
export async function createAnalysisJob(
  repoId: string,
  userId: string,
  snapshotHash: string,
  trigger: 'manual' | 'schedule'
): Promise<string> {
  const result = await db.query(
    `INSERT INTO analysis_jobs (repo_id, user_id, github_snapshot_hash, trigger, status)
     VALUES ($1, $2, $3, $4, 'queued')
     RETURNING id`,
    [repoId, userId, snapshotHash, trigger]
  );

  return result.rows[0].id;
}

