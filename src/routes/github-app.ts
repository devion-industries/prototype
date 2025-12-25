import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { getInstallationOctokit, getUserInstallationId } from '../github/app-client';
import db from '../db/client';
import config from '../config';

export default async function githubAppRoutes(fastify: FastifyInstance) {
  /**
   * GET /github/install
   * Returns URL to install the GitHub App
   */
  fastify.get('/github/install', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    
    // Store userId in state for callback verification
    const state = Buffer.from(JSON.stringify({ userId: req.userId })).toString('base64');
    
    // GitHub App installation URL
    const installUrl = `https://github.com/apps/${config.GITHUB_APP_SLUG}/installations/new?state=${state}`;
    
    return reply.send({ url: installUrl });
  });

  /**
   * GET /github/callback
   * Handles GitHub App installation callback
   */
  fastify.get('/github/callback', async (request, reply) => {
    const { installation_id, setup_action, state } = request.query as {
      installation_id?: string;
      setup_action?: string;
      state?: string;
    };

    console.log('GitHub App callback received:', { installation_id, setup_action, state });

    if (!installation_id || !state) {
      console.error('Missing installation_id or state');
      return reply.redirect(`${config.FRONTEND_URL}/onboarding?error=missing_params`);
    }

    try {
      // Decode state to get userId
      const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
      
      if (!userId) {
        console.error('Invalid state - no userId');
        return reply.redirect(`${config.FRONTEND_URL}/onboarding?error=invalid_state`);
      }

      // Get installation details from GitHub
      const octokit = await getInstallationOctokit(parseInt(installation_id));
      
      // Get the authenticated user/org for this installation
      const { data: installation } = await octokit.rest.apps.getInstallation({
        installation_id: parseInt(installation_id),
      });

      const githubLogin = installation.account?.login || 'unknown';
      const githubUserId = installation.account?.id?.toString() || '';

      // Store installation in database
      await db.query(
        `INSERT INTO github_accounts (user_id, github_user_id, github_login, installation_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           github_user_id = $2,
           github_login = $3,
           installation_id = $4`,
        [userId, githubUserId, githubLogin, installation_id]
      );

      console.log(`GitHub App installed for user ${userId}, installation ${installation_id}`);

      // Redirect back to onboarding
      return reply.redirect(`${config.FRONTEND_URL}/onboarding?github_connected=true`);
    } catch (error: any) {
      console.error('GitHub App callback error:', error);
      return reply.redirect(`${config.FRONTEND_URL}/onboarding?error=${encodeURIComponent(error.message)}`);
    }
  });

  /**
   * GET /github/installation
   * Gets current GitHub App installation status
   */
  fastify.get('/github/installation', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    try {
      const result = await db.query(
        'SELECT github_login, installation_id, created_at FROM github_accounts WHERE user_id = $1 LIMIT 1',
        [req.userId]
      );

      if (result.rows.length === 0) {
        return reply.send({ installed: false });
      }

      const { github_login, installation_id, created_at } = result.rows[0];

      return reply.send({
        installed: true,
        github_login,
        installation_id,
        created_at,
      });
    } catch (error: any) {
      console.error('Get installation error:', error);
      return reply.status(500).send({
        error: 'Failed to get installation status',
        message: error.message,
      });
    }
  });

  /**
   * DELETE /github/installation
   * Removes GitHub App installation from our database
   * Note: User must also uninstall from GitHub to revoke access
   */
  fastify.delete('/github/installation', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    try {
      // Delete from database (repos will be orphaned but user can reconnect)
      await db.query(
        'DELETE FROM github_accounts WHERE user_id = $1',
        [req.userId]
      );

      return reply.send({ success: true, message: 'GitHub connection removed' });
    } catch (error: any) {
      console.error('Delete installation error:', error);
      return reply.status(500).send({
        error: 'Failed to remove GitHub connection',
        message: error.message,
      });
    }
  });

  /**
   * GET /github/repos
   * Lists repositories accessible via GitHub App installation
   */
  fastify.get('/github/repos', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { available } = request.query as { available?: string };

    try {
      // Get user's installation ID
      const installationId = await getUserInstallationId(req.userId, db);
      
      if (!installationId) {
        return reply.status(404).send({ error: 'No GitHub App installation found' });
      }

      // Get Octokit for this installation
      const octokit = await getInstallationOctokit(installationId);

      // List repositories accessible to this installation
      const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
      });

      // If available=true, filter out already connected repos
      let repos = data.repositories.map((repo: any) => ({
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        owner: repo.owner.login,
        private: repo.private,
        default_branch: repo.default_branch,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at,
      }));

      if (available === 'true') {
        // Get already connected repo IDs
        const connectedResult = await db.query(
          'SELECT github_repo_id FROM repos WHERE user_id = $1',
          [req.userId]
        );
        const connectedIds = new Set(connectedResult.rows.map((r: any) => r.github_repo_id));
        
        // Filter out connected repos
        repos = repos.filter((repo: any) => !connectedIds.has(repo.id.toString()));
      }

      return reply.send({ repos });
    } catch (error: any) {
      console.error('GitHub repos fetch error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch repositories',
        message: error.message,
      });
    }
  });
}
