import { RepoSnapshot } from '../github/fetchers';

/**
 * Builds prompt for Maintainer Brief
 */
export function buildMaintainerBriefPrompt(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): string {
  const recentCommits = snapshot.commits.slice(0, tone === 'detailed' ? 100 : 50);
  const recentPRs = snapshot.prs.slice(0, tone === 'detailed' ? 30 : 15);

  // Analyze file churn
  const fileChurn = analyzeFileChurn(snapshot.commits);
  const topChurnFiles = Object.entries(fileChurn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => `  - ${file} (${count} changes)`)
    .join('\n');

  const commitSummary = recentCommits
    .slice(0, 20)
    .map(c => `- ${c.message.split('\n')[0]} (${c.author})`)
    .join('\n');

  const prSummary = recentPRs
    .map(pr => `- #${pr.number}: ${pr.title} by @${pr.author}`)
    .join('\n');

  return `Analyze this GitHub repository and create a Maintainer Brief.

Repository: ${snapshot.repo.full_name}
Language: ${snapshot.repo.language || 'Multiple'}
Stars: ${snapshot.repo.stargazers_count}
Last Updated: ${snapshot.repo.updated_at}

Recent Commits (${recentCommits.length} total):
${commitSummary}

Recent Merged PRs (${recentPRs.length} total):
${prSummary}

High Churn Files:
${topChurnFiles}

${snapshot.readme ? `README Summary:\n${snapshot.readme.slice(0, 1000)}...\n` : ''}

Create a Maintainer Brief in this EXACT format:

# Maintainer Brief

## Summary
[5 bullet points max - key takeaways about recent activity]

## What Changed
[Group changes by area/category - be specific]

## High Churn Files
[List files with most changes and why they matter]

## Risky Changes
[Identify potentially problematic changes with reasoning]

## Contributor Patterns
[Analyze PR/issue patterns - pain points, common questions]

## Suggested Actions
[Max 7 actionable items for maintainers]

Use ${tone === 'detailed' ? 'detailed technical' : 'concise, scannable'} language.
Be specific with commit SHAs and PR numbers.
Focus on actionable insights, not just data.`;
}

/**
 * Builds prompt for New Contributor Quickstart
 */
export function buildContributorQuickstartPrompt(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): string {
  // Extract setup info for potential future use
  // const setupInfo = extractSetupInfo(snapshot.readme, snapshot.contributing);

  return `Create a New Contributor Quickstart guide for this repository.

Repository: ${snapshot.repo.full_name}
Language: ${snapshot.repo.language || 'Multiple'}
Description: ${snapshot.repo.description || 'No description'}

${snapshot.readme ? `README:\n${snapshot.readme.slice(0, 2000)}...\n` : ''}
${snapshot.contributing ? `CONTRIBUTING:\n${snapshot.contributing.slice(0, 1000)}...\n` : ''}

Good First Issues (${snapshot.issues.length}):
${snapshot.issues.slice(0, 5).map(i => `- #${i.number}: ${i.title}`).join('\n')}

Recent PRs (for context):
${snapshot.prs.slice(0, 10).map(pr => `- #${pr.number}: ${pr.title}`).join('\n')}

Create a Contributor Quickstart in this EXACT format:

# New Contributor Quickstart

## 60-Second Overview
[What this project does in plain English]

## Setup Steps
[Clear, numbered steps to get running locally]

## Architecture Map
[Key directories and files - what goes where]

## Start Here
[Best issues/PRs for first-time contributors with links]

## Contribution Rules
[Condensed version of guidelines]

## Getting Help
[Where to ask questions]

Use ${tone === 'detailed' ? 'comprehensive' : 'minimal, fast-start'} language.
Assume reader knows how to code but not this project.`;
}

/**
 * Builds prompt for Release Summary
 */
export function buildReleaseSummaryPrompt(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): string {
  const recentCommits = snapshot.commits.slice(0, 100);
  const recentPRs = snapshot.prs.slice(0, 30);

  // Categorize changes for analysis
  // const changes = categorizeChanges(recentCommits, recentPRs);

  return `Create a Release Summary from recent repository activity.

Repository: ${snapshot.repo.full_name}

Recent Commits (${recentCommits.length}):
${recentCommits.slice(0, 30).map(c => `- ${c.sha.slice(0, 7)}: ${c.message.split('\n')[0]}`).join('\n')}

Recent Merged PRs (${recentPRs.length}):
${recentPRs.map(pr => `- #${pr.number}: ${pr.title} (${pr.labels.join(', ')})`).join('\n')}

Last Release:
${snapshot.releases[0] ? `${snapshot.releases[0].tag_name}: ${snapshot.releases[0].name}` : 'No releases found'}

Create a Release Summary in this EXACT format:

# Release Summary

## Features
[New features and enhancements]

## Fixes
[Bug fixes and corrections]

## Internal
[Refactoring, dependencies, tooling]

## Breaking Changes
[Any breaking changes - be explicit]

## Upgrade Notes
[What users need to do to upgrade]

## Copy-Ready GitHub Release
\`\`\`markdown
[Formatted release notes ready to paste]
\`\`\`

Use ${tone === 'detailed' ? 'complete technical detail' : 'concise bullet points'}.
Reference commit SHAs and PR numbers.
Identify breaking changes carefully.`;
}

/**
 * Builds prompt for Good First Issues suggestions
 */
export function buildGoodFirstIssuesPrompt(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): string {
  const existingIssues = snapshot.issues.slice(0, 15);

  // Analyze codebase for potential issues
  const fileTypes = analyzeFileTypes(snapshot.commits);
  // const commonAreas = analyzeCommonAreas(snapshot.commits);

  return `Analyze this repository and suggest Good First Issues.

Repository: ${snapshot.repo.full_name}
Language: ${snapshot.repo.language || 'Multiple'}

Existing Good First Issues (${existingIssues.length}):
${existingIssues.map(i => `- #${i.number}: ${i.title} (${i.comments} comments)`).join('\n')}

Recent Activity:
${snapshot.commits.slice(0, 20).map(c => `- ${c.message.split('\n')[0]}`).join('\n')}

Common File Types:
${Object.entries(fileTypes).slice(0, 10).map(([ext, count]) => `- ${ext}: ${count} files`).join('\n')}

${snapshot.readme ? `README:\n${snapshot.readme.slice(0, 1000)}...\n` : ''}

Create a Good First Issues list in this EXACT format:

# Good First Issues

## Suggested Issues

${tone === 'detailed' ? '[List 10-15 issues]' : '[List 5-8 issues]'}

For each issue:

### [Issue Title]
**Why Good First Issue:** [Reasoning]  
**Required Skills:** [e.g. JavaScript, documentation, testing]  
**Confidence:** [0.0 to 1.0]  
${existingIssues.length > 0 ? '**Related:** [Link to similar existing issue if applicable]' : ''}

## Analysis Notes
[Overall assessment of good first issue opportunities]

Be specific and realistic about difficulty.
Consider existing contributor patterns.
Suggest issues that actually need doing.`;
}

/**
 * Helper: Analyze file churn
 */
function analyzeFileChurn(commits: any[]): Record<string, number> {
  const churn: Record<string, number> = {};
  
  for (const commit of commits) {
    for (const file of commit.files || []) {
      churn[file] = (churn[file] || 0) + 1;
    }
  }
  
  return churn;
}

/**
 * Helper: Extract setup info from docs
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractSetupInfo(readme: string | null, contributing: string | null): string {
  const docs = [readme, contributing].filter(Boolean).join('\n\n');
  
  // Look for setup/installation sections
  const setupMatch = docs.match(/##?\s*(Setup|Installation|Getting Started|Quick Start)[\s\S]{0,1000}/i);
  
  return setupMatch ? setupMatch[0] : '';
}

/**
 * Helper: Categorize changes
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function categorizeChanges(_commits: any[], prs: any[]): {
  features: string[];
  fixes: string[];
  internal: string[];
} {
  const categories: { features: string[]; fixes: string[]; internal: string[] } = { 
    features: [], 
    fixes: [], 
    internal: [] 
  };
  
  for (const pr of prs) {
    const title = pr.title.toLowerCase();
    const labels = pr.labels.map((l: string) => l.toLowerCase());
    
    if (title.includes('feat') || labels.includes('feature') || labels.includes('enhancement')) {
      categories.features.push(pr.title);
    } else if (title.includes('fix') || labels.includes('bug')) {
      categories.fixes.push(pr.title);
    } else {
      categories.internal.push(pr.title);
    }
  }
  
  return categories;
}

/**
 * Helper: Analyze file types
 */
function analyzeFileTypes(commits: any[]): Record<string, number> {
  const types: Record<string, number> = {};
  
  for (const commit of commits) {
    for (const file of commit.files || []) {
      const ext = file.split('.').pop() || 'no-ext';
      types[ext] = (types[ext] || 0) + 1;
    }
  }
  
  return types;
}

/**
 * Helper: Analyze common areas
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function analyzeCommonAreas(commits: any[]): Record<string, number> {
  const areas: Record<string, number> = {};
  
  for (const commit of commits) {
    for (const file of commit.files || []) {
      const topDir = file.split('/')[0];
      areas[topDir] = (areas[topDir] || 0) + 1;
    }
  }
  
  return areas;
}

