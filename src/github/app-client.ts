import config from '../config';
import { App } from 'octokit';

// GitHub App instance (singleton)
let octokitAppInstance: App | null = null;

function getGitHubApp() {
  if (!octokitAppInstance) {
    octokitAppInstance = new App({
      appId: config.GITHUB_APP_ID,
      privateKey: config.GITHUB_PRIVATE_KEY,
      webhooks: {
        secret: config.GITHUB_WEBHOOK_SECRET,
      },
    });
  }
  return octokitAppInstance;
}

/**
 * GitHub App instance getter
 */
export const getApp = async (): Promise<App> => getGitHubApp();

/**
 * Get Octokit instance for a specific installation
 * @param installationId - GitHub App installation ID
 * @returns Authenticated Octokit instance
 */
export async function getInstallationOctokit(installationId: number): Promise<any> {
  const app = getGitHubApp();
  // Using the installation Octokit from the App instance
  const octokit = await app.getInstallationOctokit(installationId);
  return octokit;
}

/**
 * Get installation ID for a user
 * @param userId - User ID from database
 * @param db - Database client
 * @returns Installation ID or null
 */
export async function getUserInstallationId(userId: string, db: any): Promise<number | null> {
  const result = await db.query(
    'SELECT installation_id FROM github_accounts WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0].installation_id;
}

/**
 * Get Octokit instance for a user (convenience method)
 * @param userId - User ID from database
 * @param db - Database client
 * @returns Authenticated Octokit instance or null
 */
export async function getUserOctokit(userId: string, db: any): Promise<any> {
  const installationId = await getUserInstallationId(userId, db);
  
  if (!installationId) {
    return null;
  }
  
  return getInstallationOctokit(installationId);
}



