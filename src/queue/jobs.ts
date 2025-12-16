import { Queue } from 'bullmq';
import { queueOptions } from './config';

export interface AnalysisJobData {
  jobId: string;
  repoId: string;
  userId: string;
  owner: string;
  repo: string;
  branch: string;
  depth: 'fast' | 'deep';
  tone: 'concise' | 'detailed';
  ignorePaths: string[];
  accessToken: string;
}

export interface ExportJobData {
  exportId: string;
  outputId: string;
  format: 'markdown' | 'pdf' | 'github_release';
  content: string;
  repoFullName: string;
}

// Create queues
export const analysisQueue = new Queue<AnalysisJobData>('analysis', queueOptions);
export const exportQueue = new Queue<ExportJobData>('export', queueOptions);

/**
 * Adds an analysis job to the queue
 */
export async function enqueueAnalysisJob(data: AnalysisJobData): Promise<void> {
  await analysisQueue.add('analyze-repo', data, {
    jobId: data.jobId,
  });

  console.log(`📋 Enqueued analysis job: ${data.jobId} for ${data.owner}/${data.repo}`);
}

/**
 * Adds an export job to the queue
 */
export async function enqueueExportJob(data: ExportJobData): Promise<void> {
  await exportQueue.add('export-output', data, {
    jobId: data.exportId,
  });

  console.log(`📋 Enqueued export job: ${data.exportId} (${data.format})`);
}

/**
 * Cancels a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const job = await analysisQueue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to cancel job:', error);
    return false;
  }
}

/**
 * Gets job status from queue
 */
export async function getJobStatus(jobId: string): Promise<any> {
  const job = await analysisQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
  };
}

/**
 * Health check for queue system
 */
export async function checkQueueHealth(): Promise<boolean> {
  try {
    const client = await analysisQueue.client;
    await client.ping();
    return true;
  } catch (error) {
    console.error('Queue health check failed:', error);
    return false;
  }
}

