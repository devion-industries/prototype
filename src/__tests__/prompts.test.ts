import { 
  buildMaintainerBriefPrompt,
  buildContributorQuickstartPrompt,
  buildReleaseSummaryPrompt,
  buildGoodFirstIssuesPrompt
} from '../ai/prompts';
import { RepoSnapshot } from '../github/fetchers';

const mockSnapshot: RepoSnapshot = {
  repo: {
    id: 123,
    full_name: 'test/repo',
    default_branch: 'main',
    private: false,
    description: 'Test repository',
    language: 'TypeScript',
    stargazers_count: 100,
    updated_at: '2025-01-01T00:00:00Z',
  },
  commits: [
    {
      sha: 'abc123',
      message: 'Fix bug in auth',
      author: 'John Doe',
      date: '2025-01-01T00:00:00Z',
      files: ['src/auth.ts'],
    },
    {
      sha: 'def456',
      message: 'Add new feature',
      author: 'Jane Smith',
      date: '2025-01-02T00:00:00Z',
      files: ['src/feature.ts'],
    },
  ],
  prs: [
    {
      number: 42,
      title: 'Fix authentication bug',
      state: 'closed',
      merged_at: '2025-01-01T00:00:00Z',
      author: 'johndoe',
      body: 'Fixed a critical bug',
      labels: ['bug', 'security'],
    },
  ],
  issues: [
    {
      number: 10,
      title: 'Add documentation',
      state: 'open',
      body: 'Need better docs',
      labels: ['good first issue', 'documentation'],
      created_at: '2025-01-01T00:00:00Z',
      comments: 3,
    },
  ],
  releases: [
    {
      tag_name: 'v1.0.0',
      name: 'First Release',
      body: 'Initial release',
      published_at: '2025-01-01T00:00:00Z',
    },
  ],
  readme: '# Test Repo\n\nThis is a test repository.',
  contributing: '# Contributing\n\nFollow these rules.',
};

describe('Prompt Builders', () => {
  describe('Maintainer Brief', () => {
    it('should generate prompt with required sections', () => {
      const prompt = buildMaintainerBriefPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('Maintainer Brief');
      expect(prompt).toContain('Summary');
      expect(prompt).toContain('What Changed');
      expect(prompt).toContain('High Churn Files');
      expect(prompt).toContain('Risky Changes');
      expect(prompt).toContain('Contributor Patterns');
      expect(prompt).toContain('Suggested Actions');
    });

    it('should include repository info', () => {
      const prompt = buildMaintainerBriefPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('test/repo');
      expect(prompt).toContain('TypeScript');
    });

    it('should adapt tone', () => {
      const concise = buildMaintainerBriefPrompt(mockSnapshot, 'concise');
      const detailed = buildMaintainerBriefPrompt(mockSnapshot, 'detailed');

      expect(concise).toContain('concise');
      expect(detailed).toContain('detailed');
    });
  });

  describe('Contributor Quickstart', () => {
    it('should generate prompt with required sections', () => {
      const prompt = buildContributorQuickstartPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('Contributor Quickstart');
      expect(prompt).toContain('60-Second Overview');
      expect(prompt).toContain('Setup Steps');
      expect(prompt).toContain('Architecture Map');
      expect(prompt).toContain('Start Here');
      expect(prompt).toContain('Contribution Rules');
    });

    it('should include good first issues', () => {
      const prompt = buildContributorQuickstartPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('#10');
      expect(prompt).toContain('Add documentation');
    });
  });

  describe('Release Summary', () => {
    it('should generate prompt with required sections', () => {
      const prompt = buildReleaseSummaryPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('Release Summary');
      expect(prompt).toContain('Features');
      expect(prompt).toContain('Fixes');
      expect(prompt).toContain('Internal');
      expect(prompt).toContain('Breaking Changes');
      expect(prompt).toContain('Upgrade Notes');
    });

    it('should include commit and PR info', () => {
      const prompt = buildReleaseSummaryPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('abc123');
      expect(prompt).toContain('#42');
    });
  });

  describe('Good First Issues', () => {
    it('should generate prompt with required sections', () => {
      const prompt = buildGoodFirstIssuesPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('Good First Issues');
      expect(prompt).toContain('Suggested Issues');
      expect(prompt).toContain('Why Good First Issue');
      expect(prompt).toContain('Required Skills');
      expect(prompt).toContain('Confidence');
    });

    it('should include existing issues', () => {
      const prompt = buildGoodFirstIssuesPrompt(mockSnapshot, 'concise');

      expect(prompt).toContain('#10');
      expect(prompt).toContain('Add documentation');
    });
  });
});


