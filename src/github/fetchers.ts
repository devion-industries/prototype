import { Octokit } from '@octokit/rest';
import { githubApiCall } from './client';

/**
 * Normalizes Octokit instance to handle both @octokit/rest and GitHub App Octokit
 * GitHub App's getInstallationOctokit returns methods under .rest, while @octokit/rest has them directly
 */
function normalizeOctokit(octokit: any): Octokit {
  return octokit.rest || octokit;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  default_branch: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  author: string;
  body: string | null;
  labels: string[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string | null;
  labels: string[];
  created_at: string;
  comments: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string;
}

export interface RepoSnapshot {
  repo: GitHubRepo;
  commits: GitHubCommit[];
  prs: GitHubPR[];
  issues: GitHubIssue[];
  releases: GitHubRelease[];
  readme: string | null;
  contributing: string | null;
}

/**
 * Fetches repository metadata
 */
export async function fetchRepoMetadata(
  octokit: any,
  owner: string,
  repo: string
): Promise<GitHubRepo> {
  const octo = normalizeOctokit(octokit);
  const result = await githubApiCall(async () => {
    const { data } = await octo.repos.get({ owner, repo });
    return data;
  });

  return {
    id: result.id,
    full_name: result.full_name,
    default_branch: result.default_branch,
    private: result.private,
    description: result.description,
    language: result.language,
    stargazers_count: result.stargazers_count,
    updated_at: result.updated_at,
  };
}

/**
 * Fetches recent commits
 */
export async function fetchRecentCommits(
  octokit: any,
  owner: string,
  repo: string,
  branch: string,
  limit: number = 100,
  ignorePaths: string[] = []
): Promise<GitHubCommit[]> {
  const octo = normalizeOctokit(octokit);
  const commits: GitHubCommit[] = [];

  const result = await githubApiCall(async () => {
    return await octo.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: limit,
    });
  });

  for (const commit of result.data) {
    // Fetch files for each commit
    const commitDetail = await githubApiCall(async () => {
      return await octo.repos.getCommit({
        owner,
        repo,
        ref: commit.sha,
      });
    });

    const files = (commitDetail.data.files || [])
      .map(f => f.filename)
      .filter(filename => !shouldIgnorePath(filename, ignorePaths));

    commits.push({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || '',
      files,
    });
  }

  return commits;
}

/**
 * Fetches merged PRs from last N days
 */
export async function fetchRecentPRs(
  octokit: any,
  owner: string,
  repo: string,
  daysAgo: number = 30
): Promise<GitHubPR[]> {
  const octo = normalizeOctokit(octokit);
  const since = new Date();
  since.setDate(since.getDate() - daysAgo);

  const result = await githubApiCall(async () => {
    return await octo.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 50,
    });
  });

  return result.data
    .filter(pr => pr.merged_at && new Date(pr.merged_at) >= since)
    .map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged_at: pr.merged_at,
      author: pr.user?.login || 'Unknown',
      body: pr.body || null,
      labels: pr.labels.map(l => typeof l === 'string' ? l : l.name || ''),
    }));
}

/**
 * Fetches good first issues
 */
export async function fetchGoodFirstIssues(
  octokit: any,
  owner: string,
  repo: string
): Promise<GitHubIssue[]> {
  const octo = normalizeOctokit(octokit);
  const labels = ['good first issue', 'help wanted', 'beginner friendly'];
  const issues: GitHubIssue[] = [];

  for (const label of labels) {
    try {
      const result = await githubApiCall(async () => {
        return await octo.issues.listForRepo({
          owner,
          repo,
          state: 'open',
          labels: label,
          per_page: 20,
        });
      });

      for (const issue of result.data) {
        if (!issue.pull_request) {
          issues.push({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        body: issue.body || null,
            labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
            created_at: issue.created_at,
            comments: issue.comments,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch issues with label "${label}":`, error);
    }
  }

  // Deduplicate by number
  const seen = new Set<number>();
  return issues.filter(issue => {
    if (seen.has(issue.number)) return false;
    seen.add(issue.number);
    return true;
  });
}

/**
 * Fetches recent releases
 */
export async function fetchRecentReleases(
  octokit: any,
  owner: string,
  repo: string,
  limit: number = 5
): Promise<GitHubRelease[]> {
  const octo = normalizeOctokit(octokit);
  try {
    const result = await githubApiCall(async () => {
      return await octo.repos.listReleases({
        owner,
        repo,
        per_page: limit,
      });
    });

    return result.data.map(release => ({
      tag_name: release.tag_name,
      name: release.name,
      body: release.body || null,
      published_at: release.published_at || release.created_at,
    }));
  } catch (error) {
    console.warn('Failed to fetch releases:', error);
    return [];
  }
}

/**
 * Fetches README content
 */
export async function fetchReadme(
  octokit: any,
  owner: string,
  repo: string
): Promise<string | null> {
  const octo = normalizeOctokit(octokit);
  try {
    const result = await githubApiCall(async () => {
      return await octo.repos.getReadme({ owner, repo });
    });

    const content = Buffer.from(result.data.content, 'base64').toString('utf-8');
    return content;
  } catch (error) {
    console.warn('README not found');
    return null;
  }
}

/**
 * Fetches CONTRIBUTING.md content
 */
export async function fetchContributing(
  octokit: any,
  owner: string,
  repo: string
): Promise<string | null> {
  const octo = normalizeOctokit(octokit);
  const possiblePaths = ['CONTRIBUTING.md', 'CONTRIBUTING', '.github/CONTRIBUTING.md'];

  for (const path of possiblePaths) {
    try {
      const result = await githubApiCall(async () => {
        return await octo.repos.getContent({ owner, repo, path });
      });

      if ('content' in result.data) {
        return Buffer.from(result.data.content, 'base64').toString('utf-8');
      }
    } catch (error) {
      // Continue to next path
    }
  }

  return null;
}

/**
 * Fetches complete repository snapshot for analysis
 */
export async function fetchRepoSnapshot(
  octokit: any,
  owner: string,
  repo: string,
  branch: string,
  depth: 'fast' | 'deep',
  ignorePaths: string[] = []
): Promise<RepoSnapshot> {
  const commitLimit = depth === 'deep' ? 200 : 50;

  const [
    repoData,
    commits,
    prs,
    issues,
    releases,
    readme,
    contributing,
  ] = await Promise.all([
    fetchRepoMetadata(octokit, owner, repo),
    fetchRecentCommits(octokit, owner, repo, branch, commitLimit, ignorePaths),
    fetchRecentPRs(octokit, owner, repo, depth === 'deep' ? 60 : 30),
    fetchGoodFirstIssues(octokit, owner, repo),
    fetchRecentReleases(octokit, owner, repo),
    fetchReadme(octokit, owner, repo),
    fetchContributing(octokit, owner, repo),
  ]);

  return {
    repo: repoData,
    commits,
    prs,
    issues,
    releases,
    readme,
    contributing,
  };
}

/**
 * Lists repositories accessible to the user
 */
export async function fetchUserRepos(octokit: any): Promise<GitHubRepo[]> {
  const octo = normalizeOctokit(octokit);
  const result = await githubApiCall(async () => {
    // For installations, we use listReposAccessibleToInstallation
    if (octo.apps && typeof octo.apps.listReposAccessibleToInstallation === 'function') {
      const response = await octo.apps.listReposAccessibleToInstallation({
        per_page: 100,
      });
      return response;
    }
    
    // Fallback to authenticated user (for OAuth)
    return await octo.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });
  });

  return (result.data as any).repositories ? 
    // Format for listReposAccessibleToInstallation
    ((result.data as any).repositories as any[]).map(repo => ({
      id: repo.id,
      full_name: repo.full_name,
      default_branch: repo.default_branch,
      private: repo.private,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      updated_at: repo.updated_at || new Date().toISOString(),
    })) :
    // Format for listForAuthenticatedUser
    (result.data as any[]).map(repo => ({
      id: repo.id,
      full_name: repo.full_name,
      default_branch: repo.default_branch,
      private: repo.private,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      updated_at: repo.updated_at || new Date().toISOString(),
    }));
}

/**
 * Gets authenticated user info
 */
export async function fetchAuthenticatedUser(octokit: any) {
  const octo = normalizeOctokit(octokit);
  const result = await githubApiCall(async () => {
    return await octo.users.getAuthenticated();
  });

  return {
    id: result.data.id,
    login: result.data.login,
    email: result.data.email,
  };
}

/**
 * Helper: checks if path should be ignored
 */
function shouldIgnorePath(path: string, ignorePaths: string[]): boolean {
  for (const pattern of ignorePaths) {
    // Simple glob matching (supports ** and *)
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(path)) {
      return true;
    }
  }
  return false;
}

