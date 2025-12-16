import cron from 'node-cron';
import db from '../db/client';
import { enqueueAnalysisJob } from '../queue/jobs';
import { generateSnapshotHash, findRecentJob, createAnalysisJob } from '../analysis/idempotency';

/**
 * Scheduler for automated analysis runs
 * Runs every hour and checks for repos that need analysis
 */
export function startScheduler() {
  console.log('🕐 Starting scheduler...');

  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running scheduled analysis check...');
    await checkScheduledRepos();
  });

  console.log('✅ Scheduler started (runs hourly)');
}

async function checkScheduledRepos() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Check if within configured hours
    const { default: config } = await import('../config');
    if (hour < config.SCHEDULER_START_HOUR || hour > config.SCHEDULER_END_HOUR) {
      console.log(`Outside scheduled hours (${config.SCHEDULER_START_HOUR}-${config.SCHEDULER_END_HOUR} ${config.SCHEDULER_TIMEZONE}), skipping...`);
      return;
    }

    // Get repos with schedule enabled
    const result = await db.query(
      `SELECT 
         r.id as repo_id,
         r.user_id,
         r.full_name,
         r.github_repo_id,
         rs.branch,
         rs.analysis_depth,
         rs.output_tone,
         rs.ignore_paths,
         rs.schedule,
         ga.access_token_encrypted,
         (SELECT created_at FROM analysis_jobs 
          WHERE repo_id = r.id 
          ORDER BY created_at DESC 
          LIMIT 1) as last_job_created
       FROM repos r
       JOIN repo_settings rs ON rs.repo_id = r.id
       JOIN github_accounts ga ON ga.user_id = r.user_id
       WHERE r.status = 'active'
         AND rs.schedule != 'manual'`
    );

    for (const repo of result.rows) {
      const shouldRun = checkSchedule(repo.schedule, repo.last_job_created, dayOfWeek);

      if (!shouldRun) {
        continue;
      }

      console.log(`📅 Scheduling analysis for ${repo.full_name}`);

      try {
        await scheduleRepoAnalysis(repo);
      } catch (error) {
        console.error(`Failed to schedule ${repo.full_name}:`, error);
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
}

function checkSchedule(
  schedule: string,
  lastJobCreated: Date | null,
  dayOfWeek: number
): boolean {
  // Don't run if already ran today
  if (lastJobCreated) {
    const lastRun = new Date(lastJobCreated);
    const now = new Date();
    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastRun < 23) {
      return false; // Already ran within last 23 hours
    }
  }

  // Weekly: run on Mondays (1)
  if (schedule === 'weekly' && dayOfWeek === 1) {
    return true;
  }

  // Biweekly: run on Mondays, check if it's been at least 13 days
  if (schedule === 'biweekly' && dayOfWeek === 1) {
    if (!lastJobCreated) return true;

    const lastRun = new Date(lastJobCreated);
    const now = new Date();
    const daysSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceLastRun >= 13;
  }

  return false;
}

async function scheduleRepoAnalysis(repo: any) {
  const [owner, repoName] = repo.full_name.split('/');

  try {
    // For idempotency, using timestamp
    // In production, would fetch latest commit SHA
    const snapshotHash = generateSnapshotHash(
      repo.repo_id,
      repo.branch,
      Date.now().toString(),
      repo.analysis_depth
    );

    // Check for recent successful job
    const existingJobId = await findRecentJob(repo.repo_id, snapshotHash);
    if (existingJobId) {
      console.log(`Skipping ${repo.full_name}: recent analysis exists`);
      return;
    }

    // Create job
    const jobId = await createAnalysisJob(
      repo.repo_id,
      repo.user_id,
      snapshotHash,
      'schedule'
    );

    // Enqueue
    await enqueueAnalysisJob({
      jobId,
      repoId: repo.repo_id,
      userId: repo.user_id,
      owner,
      repo: repoName,
      branch: repo.branch,
      depth: repo.analysis_depth,
      tone: repo.output_tone,
      ignorePaths: repo.ignore_paths || [],
      accessToken: repo.access_token_encrypted,
    });

    console.log(`✅ Scheduled analysis for ${repo.full_name} (Job ID: ${jobId})`);
  } catch (error) {
    console.error(`Failed to schedule ${repo.full_name}:`, error);
  }
}

// Start scheduler if run directly
if (require.main === module) {
  startScheduler();

  // Keep process alive
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down scheduler...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down scheduler...');
    process.exit(0);
  });
}

export default startScheduler;

