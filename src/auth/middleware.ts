import { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabaseClient } from './supabase';

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  userEmail?: string;
}

/**
 * Fastify hook to verify Supabase JWT token
 * Adds userId to request object
 */
export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Add user info to request
    (request as AuthenticatedRequest).userId = data.user.id;
    (request as AuthenticatedRequest).userEmail = data.user.email;

    // Ensure user exists in our users table
    await ensureUserExists(data.user.id, data.user.email || '');
  } catch (error) {
    console.error('Auth middleware error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to authenticate request',
    });
  }
}

/**
 * Ensures user record exists in our database
 */
async function ensureUserExists(userId: string, email: string): Promise<void> {
  const { db } = await import('../db/client');
  
  await db.query(
    `INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [userId, email]
  );
}

/**
 * Creates a pre-handler hook for Fastify routes
 */
export function requireAuth() {
  return {
    preHandler: authenticateRequest,
  };
}


