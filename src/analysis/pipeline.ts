import { Job } from 'bullmq';
import { AnalysisJobData } from '../queue/jobs';
import { getInstallationOctokit } from '../github/app-client';
import { fetchRepoSnapshot } from '../github/fetchers';
import { generateAllOutputs } from '../ai/generator';
import { decrypt } from '../utils/encryption';
import { sendNotification } from '../notifications';
import { sendHtmlEmail } from '../notifications/email';
import { 
  buildWeeklyBriefEmail, 
  extractTldr, 
  extractRiskyChanges, 
  extractSuggestedActions,
  extractCriticalIssues,
  WeeklyBriefData 
} from '../notifications/templates/weekly-brief';
import db from '../db/client';

/**
 * Main analysis pipeline processor
 */
export async function processAnalysisJob(job: Job<AnalysisJobData>): Promise<void> {
  const { jobId, repoId, userId, owner, repo, branch, depth, tone, ignorePaths, installationId } = job.data;

  try {
    // Update job status to running
    await updateJobStatus(jobId, 'running', 0);
    await job.updateProgress(0);

    // Step 1: Fetch GitHub data (0-25%)
    await job.updateProgress(5);
    console.log(`📡 Getting GitHub App installation token for installation: ${installationId}`);
    const octokit = await getInstallationOctokit(installationId);

    await updateJobStatus(jobId, 'running', 25, 'Fetching repository data...');
    const snapshot = await fetchRepoSnapshot(octokit, owner, repo, branch, depth, ignorePaths);

    // Step 2: Generate AI outputs (25-85%)
    await job.updateProgress(30);
    await updateJobStatus(jobId, 'running', 60, 'Generating analysis outputs...');
    const outputs = await generateAllOutputs(snapshot, tone);

    // Step 3: Save outputs (85-95%)
    await job.updateProgress(85);
    await updateJobStatus(jobId, 'running', 85, 'Saving results...');
    await saveOutputs(jobId, repoId, outputs);

    // Step 4: Send notifications (95-100%)
    await job.updateProgress(95);
    await sendJobNotifications(userId, repoId, jobId);

    // Mark complete
    await job.updateProgress(100);
    await updateJobStatus(jobId, 'succeeded', 100);

  } catch (error: any) {
    console.error(`Analysis job ${jobId} failed:`, error);
    await updateJobStatus(jobId, 'failed', 0, error.message);
    throw error;
  }
}

/**
 * Updates job status in database
 */
async function updateJobStatus(
  jobId: string,
  status: string,
  progress: number,
  errorMessage?: string
): Promise<void> {
  const updates: string[] = ['status = $2', 'progress = $3'];
  const params: any[] = [jobId, status, progress];

  if (status === 'running' && progress === 0) {
    updates.push('started_at = NOW()');
  }

  if (status === 'succeeded' || status === 'failed') {
    updates.push('finished_at = NOW()');
  }

  if (errorMessage) {
    updates.push(`error_message = $${params.length + 1}`);
    params.push(errorMessage);
  }

  await db.query(
    `UPDATE analysis_jobs SET ${updates.join(', ')} WHERE id = $1`,
    params
  );
}

/**
 * Saves analysis outputs to database
 */
async function saveOutputs(
  jobId: string,
  repoId: string,
  outputs: any[]
): Promise<void> {
  for (const output of outputs) {
    await db.query(
      `INSERT INTO analysis_outputs (job_id, repo_id, type, content_markdown, confidence, sources_json)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        jobId,
        repoId,
        output.type,
        output.content,
        output.confidence,
        JSON.stringify(output.sources),
      ]
    );
  }
}

/**
 * Sends notifications for completed job
 */
async function sendJobNotifications(
  userId: string,
  repoId: string,
  jobId: string
): Promise<void> {
  try {
    console.log(`📬 Checking notifications for job ${jobId}, repo ${repoId}, user ${userId}`);
    
    // Get repo settings
    const settingsResult = await db.query(
      `SELECT rs.*, r.full_name
       FROM repo_settings rs
       JOIN repos r ON r.id = rs.repo_id
       WHERE rs.repo_id = $1`,
      [repoId]
    );

    if (settingsResult.rows.length === 0) {
      console.log('⚠️ No repo_settings found for repo:', repoId);
      return;
    }

    const settings = settingsResult.rows[0];
    console.log(`📬 Settings found: notify_email=${settings.notify_email}, schedule=${settings.schedule}`);

    // Get user email
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0]?.email;
    console.log(`📬 User email: ${userEmail || 'NOT FOUND'}`);

    // Send email notification
    if (settings.notify_email && userEmail) {
      console.log(`📧 Email notifications enabled, preparing to send to ${userEmail}...`);
      
      // Fetch the maintainer_brief and issue_triage outputs for this job
      const outputsResult = await db.query(
        `SELECT type, content_markdown FROM analysis_outputs 
         WHERE job_id = $1 AND type IN ('maintainer_brief', 'issue_triage')`,
        [jobId]
      );
      
      const maintainerBrief = outputsResult.rows.find(r => r.type === 'maintainer_brief')?.content_markdown || '';
      const issueTriage = outputsResult.rows.find(r => r.type === 'issue_triage')?.content_markdown || '';
      console.log(`📧 Maintainer brief content length: ${maintainerBrief.length} chars`);
      console.log(`📧 Issue triage content length: ${issueTriage.length} chars`);
      
      // Build rich email with extracted content
      const briefData: WeeklyBriefData = {
        repoFullName: settings.full_name,
        repoId: repoId,
        date: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        tldr: extractTldr(maintainerBrief),
        riskyChanges: extractRiskyChanges(maintainerBrief),
        suggestedActions: extractSuggestedActions(maintainerBrief),
        criticalIssues: extractCriticalIssues(issueTriage),
        schedule: settings.schedule || 'weekly',
      };
      
      console.log(`📧 Email data prepared: TL;DR items=${briefData.tldr.length}, Risky=${briefData.riskyChanges.length}, Actions=${briefData.suggestedActions.length}`);
      
      const { subject, html } = buildWeeklyBriefEmail(briefData);
      console.log(`📧 Email built, subject: "${subject}", HTML length: ${html.length} chars`);
      
      await sendHtmlEmail(userEmail, subject, html);
      console.log(`📧 Rich email notification sent to ${userEmail} for ${settings.full_name}`);
    } else {
      console.log(`📧 Skipping email: notify_email=${settings.notify_email}, userEmail=${userEmail || 'NOT SET'}`);
    }

    // Send Slack notification (basic for now)
    if (settings.notify_slack && settings.slack_webhook_url_encrypted) {
      const webhookUrl = decrypt(settings.slack_webhook_url_encrypted);
      await sendNotification({
        type: 'slack',
        webhookUrl,
        message: `✅ Analysis complete for *${settings.full_name}*\nView: ${process.env.FRONTEND_URL}/repo/${repoId}`,
      });
    }
  } catch (error) {
    console.error('Failed to send notifications:', error);
    // Don't fail the job if notifications fail
  }
}


