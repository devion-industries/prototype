import { Octokit } from '@octokit/rest';
import { withRetry, RateLimiter } from '../utils/retry';
import config from '../config';

// Rate limiter for GitHub API (5000 requests/hour = ~1.4 req/sec)
const githubRateLimiter = new RateLimiter(10, 1.5);

export function createGitHubClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
    userAgent: 'maintainer-brief/1.0',
  });
}

export function createAppGitHubClient(): Octokit {
  return new Octokit({
    auth: config.GITHUB_CLIENT_SECRET,
    userAgent: 'maintainer-brief/1.0',
  });
}

/**
 * Wrapper for GitHub API calls with retry and rate limiting
 */
export async function githubApiCall<T>(
  fn: () => Promise<T>
): Promise<T> {
  await githubRateLimiter.acquire();
  
  return withRetry(fn, {
    maxAttempts: 3,
    delayMs: 2000,
    shouldRetry: (error: any) => {
      // Retry on rate limit or server errors
      if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
        console.warn('GitHub rate limit hit, will retry...');
        return true;
      }
      if (error.status >= 500) {
        return true;
      }
      return false;
    },
  });
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.GITHUB_CLIENT_ID,
      client_secret: config.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await response.json() as any;

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token as string;
}

