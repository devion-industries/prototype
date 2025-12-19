import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { getApp, getInstallationOctokit, getUserOctokit } from '../github/app-client';
import { fetchUserRepos } from '../github/fetchers';
import db from '../db/client';
import config from '../config';

export default async function githubAppRoutes(fastify: FastifyInstance) {
  /**
   * GET /github/install
   * Returns GitHub App installation URL
   */
  fastify.get('/github/install', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    
    // Store userId in state for callback verification
    const state = Buffer.from(JSON.stringify({ userId: req.userId })).toString('base64');
    
    // GitHub App installation URL
    const installUrl = `https://github.com/apps/maintainer-brief/installations/new?state=${state}`;
    
    return reply.send({ url: installUrl });
  });

  /**
   * GET /github/callback
   * Handles GitHub App installation callback
   */
  fastify.get('/github/callback', async (request, reply) => {
    console.log('GitHub App callback received:', {
      query: request.query,
    });

    const { installation_id, setup_action, state } = request.query as { 
      installation_id?: string; 
      setup_action?: string;
      state?: string;
    };
    
    if (!installation_id || !state) {
      console.error('Missing installation_id or state');
      return reply.redirect(`${config.FRONTEND_URL}/dashboard?error=missing_params`);
    }

    try {
      // Decode state to get userId
      const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('Decoded userId:', userId);
      
      if (!userId) {
        console.error('Invalid state - no userId');
        return reply.redirect(`${config.FRONTEND_URL}/dashboard?error=invalid_state`);
      }

      // Get GitHub App instance
      const githubApp = await getApp();
      
      // Get installation details
      const { data: installation } = await githubApp.octokit.request(
        'GET /app/installations/{installation_id}',
        {
          installation_id: parseInt(installation_id),
        }
      );

      // Get account info (handle both user and organization types)
      const account = installation.account;
      if (!account) {
        throw new Error('Installation account is null');
      }

      const accountLogin = 'login' in account ? account.login : account.slug;
      const accountId = account.id;

      console.log('Installation details:', {
        id: installation.id,
        account: accountLogin,
      });

      // Store installation_id in database
      await db.query(
        `INSERT INTO github_accounts (
          user_id, 
          installation_id, 
          github_user_id, 
          github_login
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, github_user_id)
        DO UPDATE SET installation_id = $2`,
        [
          userId,
          installation.id,
          accountId.toString(),
          accountLogin,
        ]
      );

      console.log('GitHub App installation successful');
      
      // Redirect back to frontend with success
      const redirectUrl = setup_action === 'install' 
        ? `${config.FRONTEND_URL}/onboarding?github_connected=true`
        : `${config.FRONTEND_URL}/dashboard?github_connected=true`;
      
      return reply.redirect(redirectUrl);
    } catch (error: any) {
      console.error('GitHub App callback error:', error);
      return reply.redirect(
        `${config.FRONTEND_URL}/dashboard?error=${encodeURIComponent(error.message)}`
      );
    }
  });

  /**
   * GET /github/repos
   * Lists repositories accessible to the GitHub App installation
   */
  fastify.get('/github/repos', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    try {
      // Get user's Octokit instance
      const octokit = await getUserOctokit(req.userId, db);

      if (!octokit) {
        return reply.status(404).send({ 
          error: 'GitHub App not installed',
          message: 'Please install the GitHub App to access repositories'
        });
      }

      // Fetch repos using the installation token
      const repos = await fetchUserRepos(octokit as any);

      return reply.send({ repos });
    } catch (error: any) {
      console.error('GitHub repos fetch error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch repositories',
        message: error.message,
      });
    }
  });

  /**
   * GET /github/installation
   * Get installation details for the authenticated user
   */
  fastify.get('/github/installation', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    try {
      const result = await db.query(
        `SELECT installation_id, github_login, created_at 
         FROM github_accounts 
         WHERE user_id = $1 
         LIMIT 1`,
        [req.userId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ 
          error: 'No GitHub App installation found',
          installed: false
        });
      }

      return reply.send({
        installed: true,
        installation_id: result.rows[0].installation_id,
        github_login: result.rows[0].github_login,
        created_at: result.rows[0].created_at,
      });
    } catch (error: any) {
      console.error('Installation check error:', error);
      return reply.status(500).send({
        error: 'Failed to check installation',
        message: error.message,
      });
    }
  });

  /**
   * DELETE /github/installation
   * Remove GitHub App installation (user uninstalls)
   */
  fastify.delete('/github/installation', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    try {
      await db.query(
        'DELETE FROM github_accounts WHERE user_id = $1',
        [req.userId]
      );

      return reply.send({ 
        success: true,
        message: 'GitHub App installation removed'
      });
    } catch (error: any) {
      console.error('Installation removal error:', error);
      return reply.status(500).send({
        error: 'Failed to remove installation',
        message: error.message,
      });
    }
  });
}
