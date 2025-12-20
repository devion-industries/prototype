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
    
    // GitHub App installation URL (slug from config)
    const installUrl = `https://github.com/apps/${config.GITHUB_APP_SLUG}/installations/new?state=${state}`;
    
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
      console.log('Decoding state:', state);
      // Decode state to get userId
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      const { userId } = decodedState;
      console.log('Decoded userId from state:', userId);
      
      if (!userId) {
        console.error('Invalid state - no userId');
        return reply.redirect(`${config.FRONTEND_URL}/onboarding?error=invalid_state`);
      }

      // Get GitHub App instance
      const githubApp = await getApp();
      
      console.log('Fetching installation details for ID:', installation_id);
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

      const accountLogin = 'login' in account ? account.login : (account as any).slug;
      const accountId = account.id;

      console.log('Saving installation to DB:', {
        userId,
        installationId: installation.id,
        githubLogin: accountLogin,
      });

      // Store installation_id in database
      // We use user_id as the unique key to ensure 1 account per user
      await db.query(
        `INSERT INTO github_accounts (
          user_id, 
          installation_id, 
          github_user_id, 
          github_login,
          updated_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          installation_id = $2,
          github_user_id = $3,
          github_login = $4,
          updated_at = NOW()`,
        [
          userId,
          installation.id,
          accountId.toString(),
          accountLogin,
        ]
      );

      console.log('Database updated successfully');
      
      // Redirect back to frontend with success
      // Success redirect
      const redirectUrl = setup_action === 'install' 
        ? `${config.FRONTEND_URL}/onboarding?github_connected=true`
        : `${config.FRONTEND_URL}/dashboard?github_connected=true`;
      
      console.log('Redirecting user to:', redirectUrl);
      return reply.redirect(redirectUrl);
    } catch (error: any) {
      console.error('GitHub App callback error details:', {
        message: error.message,
        stack: error.stack,
      });
      // Redirect to onboarding with error message so user knows what happened
      return reply.redirect(
        `${config.FRONTEND_URL}/onboarding?error=${encodeURIComponent(error.message)}`
      );
    }
  });

  /**
   * GET /github/repos
   * Lists repositories accessible to the GitHub App installation
   * Returns repos from database (connected repos) with database UUIDs
   */
  fastify.get('/github/repos', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8d3b0573-4207-40dd-b592-63e02b65dcc5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'github-app.ts:GET /github/repos',message:'Endpoint called',data:{userId:req.userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    try {
      // Get user's Octokit instance
      const octokit = await getUserOctokit(req.userId, db);

      if (!octokit) {
        return reply.status(404).send({ 
          error: 'GitHub App not installed',
          message: 'Please install the GitHub App to access repositories'
        });
      }

      // First, get connected repos from database
      const dbResult = await db.query(
        `SELECT id, github_repo_id, full_name, default_branch, is_private, status, created_at,
           (SELECT finished_at FROM analysis_jobs WHERE repo_id = repos.id AND status = 'succeeded' ORDER BY finished_at DESC LIMIT 1) as last_analyzed_at
         FROM repos WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.userId]
      );

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8d3b0573-4207-40dd-b592-63e02b65dcc5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'github-app.ts:GET /github/repos',message:'Database repos fetched',data:{count:dbResult.rows.length,repos:dbResult.rows.map((r:any)=>({id:r.id,github_repo_id:r.github_repo_id,full_name:r.full_name}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // If user has connected repos, return them (with database UUIDs)
      if (dbResult.rows.length > 0) {
        const repos = dbResult.rows.map((row: any) => ({
          id: row.id, // Database UUID
          github_repo_id: row.github_repo_id,
          full_name: row.full_name,
          default_branch: row.default_branch,
          is_private: row.is_private,
          status: row.status,
          created_at: row.created_at,
          last_analyzed_at: row.last_analyzed_at,
        }));
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/8d3b0573-4207-40dd-b592-63e02b65dcc5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'github-app.ts:GET /github/repos',message:'Returning database repos',data:{repoIds:repos.map((r:any)=>r.id)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        return reply.send({ repos });
      }

      // No connected repos - fetch from GitHub and return them
      // (these won't have database IDs, so frontend should redirect to onboarding)
      const githubRepos = await fetchUserRepos(octokit as any);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8d3b0573-4207-40dd-b592-63e02b65dcc5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'github-app.ts:GET /github/repos',message:'No DB repos, returning GitHub repos',data:{count:githubRepos.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      return reply.send({ repos: githubRepos });
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




