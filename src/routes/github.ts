import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { exchangeCodeForToken, createGitHubClient } from '../github/client';
import { fetchAuthenticatedUser, fetchUserRepos } from '../github/fetchers';
import { encrypt } from '../utils/encryption';
import db from '../db/client';
import { schemas } from '../utils/validation';
import config from '../config';

export default async function githubRoutes(fastify: FastifyInstance) {
  /**
   * GET /github/auth
   * Returns GitHub OAuth URL for frontend to redirect to
   */
  fastify.get('/github/auth', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    
    // Store userId in state for callback verification
    const state = Buffer.from(JSON.stringify({ userId: req.userId })).toString('base64');
    
    const callbackUrl = config.GITHUB_CALLBACK_URL || `${config.FRONTEND_URL}/auth/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email,read:user,repo&state=${state}`;
    
    return reply.send({ url: githubAuthUrl });
  });

  /**
   * GET /github/callback
   * Handles GitHub OAuth callback
   */
  fastify.get('/github/callback', async (request, reply) => {
    console.log('GitHub callback received:', {
      query: request.query,
      headers: request.headers,
    });

    const { code, state } = request.query as { code?: string; state?: string };
    
    if (!code || !state) {
      console.error('Missing code or state:', { code: !!code, state: !!state });
      return reply.status(400).send({ error: 'Missing code or state' });
    }

    try {
      console.log('Decoding state:', state);
      // Decode state to get userId
      const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('Decoded userId:', userId);
      
      if (!userId) {
        console.error('Invalid state - no userId');
        return reply.status(400).send({ error: 'Invalid state' });
      }

      // Exchange code for token
      const accessToken = await exchangeCodeForToken(code);

      // Get GitHub user info
      const octokit = createGitHubClient(accessToken);
      const githubUser = await fetchAuthenticatedUser(octokit);

      // Encrypt and store token
      const encryptedToken = encrypt(accessToken);

      await db.query(
        `INSERT INTO github_accounts (user_id, github_user_id, github_login, access_token_encrypted)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, github_user_id)
         DO UPDATE SET access_token_encrypted = $4`,
        [userId, githubUser.id.toString(), githubUser.login, encryptedToken]
      );

      console.log('GitHub OAuth successful, redirecting to frontend');
      // Redirect back to frontend dashboard with success
      return reply.redirect(`${config.FRONTEND_URL}/dashboard?github_connected=true`);
    } catch (error: any) {
      console.error('GitHub callback error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        response: error.response?.data,
      });
      return reply.redirect(`${config.FRONTEND_URL}/dashboard?github_error=${encodeURIComponent(error.message)}`);
    }
  });

  /**
   * POST /github/connect
   * Connects GitHub account via OAuth (for direct token submission)
   */
  fastify.post('/github/connect', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = schemas.githubConnect.parse(request.body);

    try {
      let accessToken: string;

      if (body.code) {
        accessToken = await exchangeCodeForToken(body.code);
      } else if (body.token) {
        accessToken = body.token;
      } else {
        return reply.status(400).send({ error: 'Code or token required' });
      }

      // Get GitHub user info
      const octokit = createGitHubClient(accessToken);
      const githubUser = await fetchAuthenticatedUser(octokit);

      // Encrypt and store token
      const encryptedToken = encrypt(accessToken);

      const result = await db.query(
        `INSERT INTO github_accounts (user_id, github_user_id, github_login, access_token_encrypted)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, github_user_id)
         DO UPDATE SET access_token_encrypted = $4
         RETURNING id, github_login, created_at`,
        [req.userId, githubUser.id.toString(), githubUser.login, encryptedToken]
      );

      return reply.send({
        id: result.rows[0].id,
        github_login: result.rows[0].github_login,
        created_at: result.rows[0].created_at,
      });
    } catch (error: any) {
      console.error('GitHub connect error:', error);
      return reply.status(500).send({
        error: 'Failed to connect GitHub account',
        message: error.message,
      });
    }
  });

  /**
   * GET /github/repos
   * Lists repositories accessible to user
   */
  fastify.get('/github/repos', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    try {
      // Get user's GitHub account
      const accountResult = await db.query(
        'SELECT access_token_encrypted FROM github_accounts WHERE user_id = $1 LIMIT 1',
        [req.userId]
      );

      if (accountResult.rows.length === 0) {
        return reply.status(404).send({ error: 'No GitHub account connected' });
      }

      const { decrypt } = await import('../utils/encryption');
      const accessToken = decrypt(accountResult.rows[0].access_token_encrypted);

      const octokit = createGitHubClient(accessToken);
      const repos = await fetchUserRepos(octokit);

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


