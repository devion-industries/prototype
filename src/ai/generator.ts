import { generateText } from './client';
import {
  buildMaintainerBriefPrompt,
  buildContributorQuickstartPrompt,
  buildReleaseSummaryPrompt,
  buildGoodFirstIssuesPrompt,
} from './prompts';
import { RepoSnapshot } from '../github/fetchers';

export interface AnalysisOutput {
  type: 'maintainer_brief' | 'contributor_quickstart' | 'release_summary' | 'good_first_issues';
  content: string;
  confidence: number;
  sources: {
    commits: string[];
    prs: number[];
    issues: number[];
  };
}

/**
 * Generates all 4 analysis outputs for a repository
 */
export async function generateAllOutputs(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): Promise<AnalysisOutput[]> {
  // Check if we have enough data
  if (snapshot.commits.length < 5) {
    throw new Error('Insufficient data: need at least 5 commits for analysis');
  }

  const sources = {
    commits: snapshot.commits.slice(0, 50).map(c => c.sha),
    prs: snapshot.prs.slice(0, 30).map(pr => pr.number),
    issues: snapshot.issues.map(i => i.number),
  };

  // Generate all outputs in parallel
  const [maintainerBrief, contributorQuickstart, releaseSummary, goodFirstIssues] = await Promise.all([
    generateMaintainerBrief(snapshot, tone),
    generateContributorQuickstart(snapshot, tone),
    generateReleaseSummary(snapshot, tone),
    generateGoodFirstIssues(snapshot, tone),
  ]);

  return [
    {
      type: 'maintainer_brief',
      content: maintainerBrief,
      confidence: calculateConfidence(snapshot, 'maintainer_brief'),
      sources,
    },
    {
      type: 'contributor_quickstart',
      content: contributorQuickstart,
      confidence: calculateConfidence(snapshot, 'contributor_quickstart'),
      sources,
    },
    {
      type: 'release_summary',
      content: releaseSummary,
      confidence: calculateConfidence(snapshot, 'release_summary'),
      sources,
    },
    {
      type: 'good_first_issues',
      content: goodFirstIssues,
      confidence: calculateConfidence(snapshot, 'good_first_issues'),
      sources,
    },
  ];
}

async function generateMaintainerBrief(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): Promise<string> {
  const prompt = buildMaintainerBriefPrompt(snapshot, tone);
  return await generateText(prompt, { maxTokens: tone === 'detailed' ? 3000 : 2000 });
}

async function generateContributorQuickstart(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): Promise<string> {
  const prompt = buildContributorQuickstartPrompt(snapshot, tone);
  return await generateText(prompt, { maxTokens: tone === 'detailed' ? 3000 : 2000 });
}

async function generateReleaseSummary(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): Promise<string> {
  const prompt = buildReleaseSummaryPrompt(snapshot, tone);
  return await generateText(prompt, { maxTokens: tone === 'detailed' ? 3000 : 2000 });
}

async function generateGoodFirstIssues(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): Promise<string> {
  const prompt = buildGoodFirstIssuesPrompt(snapshot, tone);
  return await generateText(prompt, { maxTokens: tone === 'detailed' ? 2500 : 1500 });
}

/**
 * Calculates confidence score based on data quality
 */
function calculateConfidence(
  snapshot: RepoSnapshot,
  outputType: string
): number {
  let score = 0.5; // Base score

  // More commits = higher confidence
  if (snapshot.commits.length >= 50) score += 0.2;
  else if (snapshot.commits.length >= 20) score += 0.1;

  // PRs add context
  if (snapshot.prs.length >= 10) score += 0.1;
  else if (snapshot.prs.length >= 5) score += 0.05;

  // Documentation helps
  if (snapshot.readme) score += 0.1;
  if (snapshot.contributing) score += 0.05;

  // Type-specific adjustments
  if (outputType === 'good_first_issues') {
    if (snapshot.issues.length >= 5) score += 0.1;
    else if (snapshot.issues.length === 0) score -= 0.2;
  }

  if (outputType === 'release_summary') {
    if (snapshot.releases.length > 0) score += 0.05;
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}


