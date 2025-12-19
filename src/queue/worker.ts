import { Worker, Job } from 'bullmq';
import { workerOptions } from './config';
import { AnalysisJobData, ExportJobData } from './jobs';
import { processAnalysisJob } from '../analysis/pipeline';
import { processExportJob } from '../analysis/exports';

// Analysis worker
export const analysisWorker = new Worker<AnalysisJobData>(
  'analysis',
  async (job: Job<AnalysisJobData>) => {
    console.log(`🔄 Processing analysis job: ${job.id}`);

    try {
      await processAnalysisJob(job);
      console.log(`✅ Completed analysis job: ${job.id}`);
    } catch (error: any) {
      console.error(`❌ Analysis job failed: ${job.id}`, error);
      throw error;
    }
  },
  workerOptions
);

// Export worker
export const exportWorker = new Worker<ExportJobData>(
  'export',
  async (job: Job<ExportJobData>) => {
    console.log(`🔄 Processing export job: ${job.id}`);

    try {
      await processExportJob(job);
      console.log(`✅ Completed export job: ${job.id}`);
    } catch (error: any) {
      console.error(`❌ Export job failed: ${job.id}`, error);
      throw error;
    }
  },
  workerOptions
);

// Event handlers
analysisWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

analysisWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

analysisWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

exportWorker.on('completed', (job) => {
  console.log(`✅ Export ${job.id} completed`);
});

exportWorker.on('failed', (job, err) => {
  console.error(`❌ Export ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...');
  await analysisWorker.close();
  await exportWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing workers...');
  await analysisWorker.close();
  await exportWorker.close();
  process.exit(0);
});

// Start workers
if (require.main === module) {
  console.log('🚀 Workers started');
  console.log(`   - Analysis worker (concurrency: ${workerOptions.concurrency})`);
  console.log(`   - Export worker (concurrency: ${workerOptions.concurrency})`);
}

export default { analysisWorker, exportWorker };


