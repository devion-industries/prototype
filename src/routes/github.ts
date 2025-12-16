import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { exchangeCodeForToken, createGitHubClient } from '../github/client';
import { fetchAuthenticatedUser, fetchUserRepos } from '../github/fetchers';
import { encrypt } from '../utils/encryption';
import db from '../db/client';
import { schemas } from '../utils/validation';

export default async function githubRoutes(fastify: FastifyInstance) {
  /**
   * POST /github/connect
   * Connects GitHub account via OAuth
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

