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
  // Analyze codebase structure for architecture insights
  const fileChurn = analyzeFileChurn(snapshot.commits);
  const topChurnFiles = Object.entries(fileChurn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  const directoryActivity = analyzeDirectoryActivity(snapshot.commits);
  const topDirectories = Object.entries(directoryActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Find stable vs volatile areas
  const stableAreas = Object.entries(directoryActivity)
    .filter(([_, count]) => count <= 3)
    .map(([dir]) => dir)
    .slice(0, 5);

  const volatileAreas = topDirectories.slice(0, 3).map(([dir]) => dir);

  // Recent commit patterns for context
  const recentCommitMessages = snapshot.commits.slice(0, 30)
    .map(c => c.message.split('\n')[0])
    .join('\n');

  return `You are an expert developer onboarding specialist. Create a DEEP, REPO-SPECIFIC contributor guide.

DO NOT write generic content like "clone the repo" or "npm install".
DO analyze the actual codebase and provide INSIGHTS that only come from understanding THIS specific project.

Repository: ${snapshot.repo.full_name}
Primary Language: ${snapshot.repo.language || 'Multiple'}
Description: ${snapshot.repo.description || 'No description'}

===== ACTUAL CODEBASE DATA =====

README Content:
${snapshot.readme ? snapshot.readme.slice(0, 3000) : 'No README found'}

CONTRIBUTING Guide:
${snapshot.contributing ? snapshot.contributing.slice(0, 1500) : 'No CONTRIBUTING.md found'}

Most Active Directories (by commit frequency):
${topDirectories.map(([dir, count]) => `- ${dir}/ (${count} changes)`).join('\n')}

High-Churn Files (most frequently modified):
${topChurnFiles.map(([file, count]) => `- ${file} (${count} changes)`).join('\n')}

Low-Activity/Stable Areas:
${stableAreas.length > 0 ? stableAreas.map(d => `- ${d}/`).join('\n') : 'None identified'}

Recent Development Focus (last 30 commits):
${recentCommitMessages}

Recent PRs (shows what contributors work on):
${snapshot.prs.slice(0, 15).map(pr => `- #${pr.number}: ${pr.title} by @${pr.author}`).join('\n')}

Open Issues Tagged for Contributors:
${snapshot.issues.length > 0 
  ? snapshot.issues.slice(0, 8).map(i => `- #${i.number}: ${i.title} (${i.labels.join(', ')})`).join('\n')
  : 'No tagged issues found'}

===== GENERATE THIS EXACT FORMAT =====

# Contributor Intelligence Report

## 🧠 Mental Model (How This Codebase Works)

[THIS IS THE MOST IMPORTANT SECTION]
Explain the high-level architecture in 3-5 bullet points:
- What is the data flow?
- Where does the main logic live?
- How do the pieces connect?
- What's the request/response lifecycle?

Be SPECIFIC to this repo. Reference actual directories and files.

## 🚀 Environment Setup

[Don't just say "npm install" - provide CONTEXT]
- What specific tech stack is this? (e.g., "Vite + React 18 + Supabase backend")
- What environment variables are likely needed?
- Any prerequisites specific to this project?
- What port does it run on?

## 📍 Start Here (Specific Recommendations)

Based on the codebase analysis, recommend:
1. **First file to read**: [specific file] - because [reason]
2. **Best directory for first PR**: [specific dir] - because [reason based on activity data]
3. **Avoid starting with**: [specific area] - because [reason - e.g., high churn, complex, foundational]

## ⚠️ Complexity Zones (What NOT to Touch First)

Based on file churn and commit patterns:
${volatileAreas.length > 0 ? `
The following areas have high activity and interconnected changes:
${volatileAreas.map(area => `- \`${area}/\` - [explain why it's complex based on the data]`).join('\n')}

Wait until you understand the codebase before modifying these.
` : 'No high-complexity zones identified.'}

## 🗺️ Architecture Deep-Dive

[Go beyond folder listing - explain PURPOSE]
For each major directory, explain:
- What lives here
- How it connects to other parts
- The pattern/convention used

## 🎯 Recommended First Contributions

Based on recent activity and open issues:
${snapshot.issues.length > 0 
  ? '[Pick 2-3 specific issues and explain WHY they are good starting points]'
  : '[Suggest documentation improvements or test additions based on gaps you see]'}

## 💡 Codebase Insights

Observations from analyzing recent commits:
- What areas are actively being developed?
- What patterns does this team use?
- Any conventions you noticed?

Use ${tone === 'detailed' ? 'comprehensive technical detail' : 'concise but specific'} language.
Every statement should reference actual files, directories, or patterns from the data provided.
If you're not sure about something, say "Based on the commit patterns, it appears..." rather than guessing.`;
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

Create a Release Summary in this EXACT format. DO NOT add any content after the final code block.

# Release Summary

## Features
[New features and enhancements - bullet points with commit SHAs]

## Fixes
[Bug fixes and corrections - bullet points with commit SHAs]

## Internal
[Refactoring, dependencies, tooling - keep brief]

## Breaking Changes
[Any breaking changes - be explicit, or "None" if none]

## Upgrade Notes
[What users need to do to upgrade, or "No action required" if none]

---

**Copy-Ready Release Notes** (paste directly into GitHub Releases):

\`\`\`
# What's New

## ✨ Features
[Concise list for end users]

## 🐛 Bug Fixes
[Concise list for end users]

## ⚠️ Breaking Changes
[If any]

---
Full changelog: [link to commits]
\`\`\`

IMPORTANT:
- Use ${tone === 'detailed' ? 'complete technical detail' : 'concise bullet points'}.
- Reference commit SHAs in parentheses like (abc1234).
- The code block above is the FINAL output. Do NOT write anything after it.
- Keep "Internal" section brief - users care most about Features and Fixes.`;
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
  const fileChurn = analyzeFileChurn(snapshot.commits);
  const directoryActivity = analyzeDirectoryActivity(snapshot.commits);
  
  // Find stable areas good for first contributions
  const stableAreas = Object.entries(directoryActivity)
    .filter(([_, count]) => count >= 2 && count <= 8)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([dir]) => dir);

  // Recent commit patterns for context
  const recentCommits = snapshot.commits.slice(0, 30);
  const recentPRs = snapshot.prs.slice(0, 20);

  return `You are an expert at identifying high-quality entry points for new contributors.

Analyze this repository and create a STRATEGIC list of Good First Issues.

Repository: ${snapshot.repo.full_name}
Language: ${snapshot.repo.language || 'Multiple'}
Stars: ${snapshot.repo.stargazers_count}

===== EXISTING ISSUES ANALYSIS =====

Current Good First Issues (${existingIssues.length}):
${existingIssues.length > 0 
  ? existingIssues.map(i => `- #${i.number}: ${i.title} [Labels: ${i.labels.join(', ')}] (${i.comments} comments)`).join('\n')
  : 'No existing good first issues found.'}

===== CODEBASE ACTIVITY DATA =====

Recent Commits (${recentCommits.length}):
${recentCommits.map(c => `- ${c.sha.slice(0, 7)}: ${c.message.split('\n')[0]} [${c.files?.slice(0, 3).join(', ') || 'no files'}]`).join('\n')}

Recent PRs (${recentPRs.length}):
${recentPRs.map(pr => `- #${pr.number}: ${pr.title} by @${pr.author}`).join('\n')}

Common File Types:
${Object.entries(fileTypes).slice(0, 10).map(([ext, count]) => `- .${ext}: ${count} files changed`).join('\n')}

Stable Areas (good for first PRs):
${stableAreas.length > 0 ? stableAreas.map(d => `- ${d}/`).join('\n') : 'None identified'}

High-Churn Files (avoid for first PRs):
${Object.entries(fileChurn).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([file, count]) => `- ${file} (${count} changes)`).join('\n')}

${snapshot.readme ? `README (for context):\n${snapshot.readme.slice(0, 1500)}...\n` : ''}
${snapshot.contributing ? `CONTRIBUTING (for context):\n${snapshot.contributing.slice(0, 800)}...\n` : ''}

===== GENERATE THIS EXACT FORMAT =====

# Good First Issues

> **Based on recent commits and PRs, these are the safest and most impactful entry points for new contributors right now.**

---

## 📚 Documentation
${tone === 'detailed' ? '[List 2-4 documentation issues]' : '[List 1-2 documentation issues]'}

For each:
### [Clear, actionable title]
**Why this is safe:** [1 sentence - what makes it low-risk]  
**What to do:** [Specific action - which file to edit, what to add]  
**Files:** \`path/to/relevant/file.md\`  
**Confidence:** ⭐⭐⭐⭐⭐ (5/5) or similar  

---

## 🧪 Testing
${tone === 'detailed' ? '[List 2-3 testing issues]' : '[List 1-2 testing issues]'}

For each:
### [Clear, actionable title]
**Why this is safe:** [1 sentence]  
**What to do:** [Specific action]  
**Files:** \`path/to/test/file.test.ts\`  
**Confidence:** ⭐⭐⭐⭐ (4/5) or similar  

---

## 🔧 Code Improvements
${tone === 'detailed' ? '[List 3-5 refactoring/improvement issues]' : '[List 2-3 issues]'}

For each:
### [Clear, actionable title]
**Why this is safe:** [1 sentence - reference the stability data]  
**What to do:** [Specific action]  
**Files:** \`path/to/file.ts\`  
**Related:** ${existingIssues.length > 0 ? '[Link to existing issue #X if related]' : '[Any related PRs]'}  
**Confidence:** ⭐⭐⭐ (3/5) or similar  

---

## 🎨 UX/UI (if applicable)
${tone === 'detailed' ? '[List 1-3 UX issues if this has a frontend]' : '[List 1 UX issue if applicable]'}

For each:
### [Clear, actionable title]
**Why this is safe:** [1 sentence]  
**What to do:** [Specific action]  
**Files:** \`path/to/component.tsx\`  
**Confidence:** ⭐⭐⭐⭐ (4/5) or similar  

---

## 📊 How We Generated These

<details>
<summary>Analysis methodology (click to expand)</summary>

We analyzed:
- ${recentCommits.length} recent commits
- ${recentPRs.length} merged PRs
- File churn patterns
- Directory stability

**Stable areas identified:** ${stableAreas.join(', ') || 'None'}

**Avoided areas:** High-churn files that would require deep context

</details>

---

IMPORTANT RULES:
1. Every issue MUST have a specific file path - not "somewhere in the codebase"
2. Every issue MUST be actionable - a new contributor should know exactly what to do
3. Reference actual file paths from the commit data provided
4. If an existing issue is related, reference it by number: "See #123"
5. Confidence should reflect actual risk - documentation is 5/5, core logic is 2/5
6. Don't suggest issues that require understanding complex systems
7. Prefer stable areas over high-churn areas for safety`;
}

/**
 * Builds prompt for Issue Triage Report
 */
export function buildIssueTriagePrompt(
  snapshot: RepoSnapshot,
  tone: 'concise' | 'detailed'
): string {
  const allIssues = snapshot.allIssues || [];
  
  if (allIssues.length === 0) {
    return `No open issues found in repository ${snapshot.repo.full_name}. Generate a brief message explaining that there are no issues to triage.`;
  }

  // Calculate issue age
  const now = new Date();
  const issuesWithAge = allIssues.map(issue => {
    const created = new Date(issue.created_at);
    const ageInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return { ...issue, ageInDays };
  });

  // Sort by reactions + comments (engagement) for prioritization hints
  const sortedByEngagement = [...issuesWithAge].sort((a, b) => 
    ((b.reactions || 0) + b.comments) - ((a.reactions || 0) + a.comments)
  );

  // Find stale issues (>90 days with no recent activity)
  const staleIssues = issuesWithAge.filter(i => i.ageInDays > 90);

  // Recent commit patterns to understand current focus
  const recentCommitMessages = snapshot.commits.slice(0, 20)
    .map(c => c.message.split('\n')[0])
    .join('\n');

  return `You are an expert project manager analyzing GitHub issues to help maintainers prioritize their backlog.

Repository: ${snapshot.repo.full_name}
Language: ${snapshot.repo.language || 'Multiple'}
Total Open Issues: ${allIssues.length}
Stale Issues (>90 days): ${staleIssues.length}

===== ALL OPEN ISSUES =====

${issuesWithAge.slice(0, 50).map(issue => `
#${issue.number}: ${issue.title}
- Labels: ${issue.labels.length > 0 ? issue.labels.join(', ') : 'none'}
- Age: ${issue.ageInDays} days
- Comments: ${issue.comments}
- Reactions: ${issue.reactions || 0}
- Author: @${issue.author || 'unknown'}
${issue.body ? `- Description: ${issue.body.slice(0, 300)}${issue.body.length > 300 ? '...' : ''}` : '- No description'}
`).join('\n---\n')}

===== RECENT DEVELOPMENT CONTEXT =====

Recent commits show the team is working on:
${recentCommitMessages}

Recent PRs:
${snapshot.prs.slice(0, 10).map(pr => `- #${pr.number}: ${pr.title}`).join('\n')}

===== HIGHEST ENGAGEMENT ISSUES =====

Top issues by community interest (reactions + comments):
${sortedByEngagement.slice(0, 5).map(i => `- #${i.number}: ${i.title} (${(i.reactions || 0) + i.comments} engagement)`).join('\n')}

===== GENERATE THIS EXACT FORMAT =====

# Issue Triage Report

> **${allIssues.length} open issues analyzed** • Generated ${new Date().toLocaleDateString()}

---

## 🔴 Critical Priority
[Issues that are blocking, security-related, or affecting many users]
[For each issue, explain WHY it's critical]

${tone === 'detailed' ? 'Include 3-5 issues with full reasoning' : 'Include 2-3 issues'}

Format for each:
### #[number]: [title]
**Why Critical:** [1-2 sentences explaining impact]
**Suggested Action:** [What maintainer should do]
**Labels to Add:** [Suggest appropriate labels if missing]

---

## 🟠 High Priority
[Important issues that should be addressed soon - feature requests with high demand, significant bugs]

${tone === 'detailed' ? 'Include 4-6 issues' : 'Include 2-4 issues'}

Format for each:
### #[number]: [title]
**Why Important:** [1 sentence]
**Effort Estimate:** Low/Medium/High
**Suggested Action:** [Brief action]

---

## 🟡 Medium Priority
[Good to fix but not urgent - smaller bugs, enhancements, documentation]

${tone === 'detailed' ? 'Include 5-8 issues' : 'Include 3-5 issues'}

Format for each:
- **#[number]**: [title] — [1 sentence summary] • Effort: [Low/Med/High]

---

## ⚪ Low Priority / Backlog
[Nice to have, long-term ideas, minor improvements]

${tone === 'detailed' ? 'Include remaining issues' : 'Include 3-5 issues'}

Format: Brief list with issue numbers and titles

---

## 🗑️ Recommend Closing
[Issues that should be closed - stale with no activity, duplicates, won't fix, already resolved]

${staleIssues.length > 0 ? `
Found ${staleIssues.length} stale issues (>90 days old). Review these for closure:
` : 'No obviously stale issues found.'}

For each:
- **#[number]**: [title] — **Reason:** [duplicate of #X / stale / wont fix / resolved]

---

## 📊 Backlog Health Summary

| Metric | Value |
|--------|-------|
| Total Open | ${allIssues.length} |
| Critical | [count] |
| Stale (>90d) | ${staleIssues.length} |
| Unlabeled | [count issues with no labels] |
| Avg Age | [calculate] days |

**Recommendations:**
1. [Top recommendation based on analysis]
2. [Second recommendation]
3. [Third recommendation]

---

IMPORTANT RULES:
1. Every issue you mention MUST use the exact issue number from the data
2. Base priority on: user impact, engagement (reactions+comments), alignment with recent development
3. Be specific about WHY each issue has its priority level
4. If an issue seems like a duplicate, mention it
5. Consider issue age - very old issues with no activity may need closure
6. Look at labels to understand existing categorization
7. Suggest missing labels where appropriate`;
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

/**
 * Helper: Analyze directory activity (with nested dirs)
 */
function analyzeDirectoryActivity(commits: any[]): Record<string, number> {
  const dirs: Record<string, number> = {};
  
  for (const commit of commits) {
    for (const file of commit.files || []) {
      // Get up to 2 levels of directory depth
      const parts = file.split('/');
      if (parts.length > 1) {
        const dir1 = parts[0];
        dirs[dir1] = (dirs[dir1] || 0) + 1;
        
        if (parts.length > 2) {
          const dir2 = `${parts[0]}/${parts[1]}`;
          dirs[dir2] = (dirs[dir2] || 0) + 1;
        }
      }
    }
  }
  
  return dirs;
}

