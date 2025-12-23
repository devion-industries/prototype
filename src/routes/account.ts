import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import db from '../db/client';
import { createClient } from '@supabase/supabase-js';
import config from '../config';

export default async function accountRoutes(fastify: FastifyInstance) {
  /**
   * DELETE /account
   * Permanently deletes user account and all associated data
   */
  fastify.delete('/account', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const userId = req.userId;

    try {
      // Start a transaction to ensure all data is deleted atomically
      await db.query('BEGIN');

      try {
        // 1. Delete all export requests (via cascade, but let's be explicit)
        await db.query(
          `DELETE FROM export_requests 
           WHERE output_id IN (
             SELECT ao.id FROM analysis_outputs ao
             JOIN repos r ON r.id = ao.repo_id
             WHERE r.user_id = $1
           )`,
          [userId]
        );

        // 2. Delete all analysis outputs (via cascade from repos, but explicit)
        await db.query(
          `DELETE FROM analysis_outputs 
           WHERE repo_id IN (SELECT id FROM repos WHERE user_id = $1)`,
          [userId]
        );

        // 3. Delete all analysis jobs
        await db.query(
          `DELETE FROM analysis_jobs 
           WHERE repo_id IN (SELECT id FROM repos WHERE user_id = $1)`,
          [userId]
        );

        // 4. Delete all repo settings
        await db.query(
          `DELETE FROM repo_settings 
           WHERE repo_id IN (SELECT id FROM repos WHERE user_id = $1)`,
          [userId]
        );

        // 5. Delete all repositories
        const reposResult = await db.query(
          'DELETE FROM repos WHERE user_id = $1 RETURNING id, full_name',
          [userId]
        );

        // 6. Delete GitHub account connection
        await db.query(
          'DELETE FROM github_accounts WHERE user_id = $1',
          [userId]
        );

        // 7. Commit the transaction
        await db.query('COMMIT');

        // 8. Delete the user from Supabase Auth (requires service role)
        // Note: This requires the SUPABASE_SERVICE_ROLE_KEY
        if (config.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const supabaseAdmin = createClient(
              config.SUPABASE_URL,
              config.SUPABASE_SERVICE_ROLE_KEY,
              { auth: { autoRefreshToken: false, persistSession: false } }
            );
            
            await supabaseAdmin.auth.admin.deleteUser(userId);
            console.log(`Successfully deleted Supabase auth user: ${userId}`);
          } catch (authError: any) {
            // Log but don't fail - data is already deleted
            console.error('Failed to delete Supabase auth user:', authError.message);
          }
        }

        console.log(`Account deleted for user ${userId}. Repos removed: ${reposResult.rows.length}`);

        return reply.send({
          success: true,
          message: 'Your account and all associated data have been permanently deleted.',
          deleted: {
            repositories: reposResult.rows.length,
          }
        });
      } catch (error) {
        // Rollback on error
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      console.error('Delete account error:', error);
      return reply.status(500).send({
        error: 'Failed to delete account',
        message: error.message,
      });
    }
  });

  /**
   * GET /account/data
   * Returns all user data (for data export / GDPR compliance)
   */
  fastify.get('/account/data', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const userId = req.userId;

    try {
      // Get GitHub account info
      const githubResult = await db.query(
        'SELECT github_login, created_at FROM github_accounts WHERE user_id = $1',
        [userId]
      );

      // Get all repositories
      const reposResult = await db.query(
        `SELECT 
           r.id, r.full_name, r.is_private, r.created_at,
           rs.branch, rs.schedule, rs.notify_email
         FROM repos r
         LEFT JOIN repo_settings rs ON rs.repo_id = r.id
         WHERE r.user_id = $1`,
        [userId]
      );

      // Get all analysis outputs
      const outputsResult = await db.query(
        `SELECT 
           ao.type, ao.content_markdown, ao.created_at,
           r.full_name as repo_name
         FROM analysis_outputs ao
         JOIN repos r ON r.id = ao.repo_id
         WHERE r.user_id = $1
         ORDER BY ao.created_at DESC`,
        [userId]
      );

      return reply.send({
        user_id: userId,
        github_account: githubResult.rows[0] || null,
        repositories: reposResult.rows,
        analysis_outputs: outputsResult.rows,
        exported_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Export account data error:', error);
      return reply.status(500).send({
        error: 'Failed to export account data',
        message: error.message,
      });
    }
  });
}

