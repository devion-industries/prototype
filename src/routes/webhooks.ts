import { FastifyInstance } from 'fastify';
import { getApp } from '../github/app-client';
import db from '../db/client';

export default async function webhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/github
   * Handles GitHub App webhook events
   */
  fastify.post('/webhooks/github', async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;
    const id = request.headers['x-github-delivery'] as string;

    console.log('Webhook received:', { event, id });

    try {
      // Get GitHub App instance
      const githubApp = await getApp();
      
      // Verify webhook signature
      await githubApp.webhooks.verify(
        JSON.stringify(request.body),
        signature
      );

      // Handle different webhook events
      switch (event) {
        case 'installation':
          await handleInstallation(request.body as any);
          break;
        
        case 'installation_repositories':
          await handleInstallationRepositories(request.body as any);
          break;
        
        case 'push':
          await handlePush(request.body as any);
          break;
        
        case 'pull_request':
          await handlePullRequest(request.body as any);
          break;
        
        case 'issues':
          await handleIssues(request.body as any);
          break;
        
        case 'release':
          await handleRelease(request.body as any);
          break;
        
        default:
          console.log(`Unhandled event: ${event}`);
      }

      return reply.send({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      return reply.status(400).send({ 
        error: 'Webhook validation failed',
        message: error.message 
      });
    }
  });
}

/**
 * Handle installation events (app installed/uninstalled)
 */
async function handleInstallation(payload: any) {
  const { action, installation } = payload;
  
  console.log('Installation event:', action);

  if (action === 'deleted') {
    // Remove installation from database
    await db.query(
      'DELETE FROM github_accounts WHERE installation_id = $1',
      [installation.id]
    );
    console.log(`Installation ${installation.id} removed`);
  }
}

/**
 * Handle installation_repositories events (repos added/removed)
 */
async function handleInstallationRepositories(payload: any) {
  const { action, installation, repositories_added, repositories_removed } = payload;
  
  console.log('Installation repositories event:', action);
  
  // TODO: Update repos table based on added/removed repositories
  if (repositories_added?.length > 0) {
    console.log('Repositories added:', repositories_added.map((r: any) => r.full_name));
  }
  
  if (repositories_removed?.length > 0) {
    console.log('Repositories removed:', repositories_removed.map((r: any) => r.full_name));
  }
}

/**
 * Handle push events (new commits)
 */
async function handlePush(payload: any) {
  const { repository, ref, commits } = payload;
  
  console.log('Push event:', {
    repo: repository.full_name,
    ref,
    commits: commits?.length || 0,
  });
  
  // TODO: Check if this repo should trigger auto-analysis
  // TODO: Queue analysis job if needed
}

/**
 * Handle pull_request events
 */
async function handlePullRequest(payload: any) {
  const { action, pull_request, repository } = payload;
  
  console.log('Pull request event:', {
    action,
    repo: repository.full_name,
    pr: pull_request.number,
    title: pull_request.title,
  });
  
  // TODO: Update PR data for analysis
  // TODO: Maybe post AI-generated PR summary as comment (future feature)
}

/**
 * Handle issues events
 */
async function handleIssues(payload: any) {
  const { action, issue, repository } = payload;
  
  console.log('Issue event:', {
    action,
    repo: repository.full_name,
    issue: issue.number,
    title: issue.title,
  });
  
  // TODO: Update issue data for analysis
  // TODO: Maybe auto-label as "good first issue" (future feature)
}

/**
 * Handle release events
 */
async function handleRelease(payload: any) {
  const { action, release, repository } = payload;
  
  console.log('Release event:', {
    action,
    repo: repository.full_name,
    tag: release.tag_name,
  });
  
  // TODO: Trigger release notes generation
}



