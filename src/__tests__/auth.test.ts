import { authenticateRequest } from '../auth/middleware';
import { verifyRepoOwnership, verifyJobOwnership, verifyOutputOwnership } from '../auth/ownership';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mock Supabase
jest.mock('../auth/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
    },
  }),
}));

// Mock database
jest.mock('../db/client', () => ({
  __esModule: true,
  default: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  },
  db: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it('should reject requests without authorization header', async () => {
    await authenticateRequest(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    );

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
      })
    );
  });

  it('should reject requests with invalid authorization format', async () => {
    mockRequest.headers = { authorization: 'InvalidToken' };

    await authenticateRequest(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    );

    expect(mockReply.status).toHaveBeenCalledWith(401);
  });

  it('should accept valid bearer token', async () => {
    mockRequest.headers = { authorization: 'Bearer valid-token' };

    await authenticateRequest(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply
    );

    // Should not call reply methods if successful
    expect(mockReply.status).not.toHaveBeenCalled();
  });
});

describe('Ownership Verification', () => {
  const db = require('../db/client').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify repo ownership correctly', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'repo-1' }] });

    const result = await verifyRepoOwnership('user-1', 'repo-1');
    expect(result).toBe(true);
  });

  it('should reject non-owned repos', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const result = await verifyRepoOwnership('user-1', 'repo-2');
    expect(result).toBe(false);
  });

  it('should verify job ownership correctly', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'job-1' }] });

    const result = await verifyJobOwnership('user-1', 'job-1');
    expect(result).toBe(true);
  });

  it('should verify output ownership correctly', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'output-1' }] });

    const result = await verifyOutputOwnership('user-1', 'output-1');
    expect(result).toBe(true);
  });
});


