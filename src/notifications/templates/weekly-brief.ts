import config from '../../config';

export interface WeeklyBriefData {
  repoFullName: string;
  repoId: string;
  date: string;
  tldr: string[];
  riskyChanges: string[];
  suggestedActions: string[];
  schedule: 'weekly' | 'biweekly';
}

/**
 * Builds the HTML email for weekly/biweekly maintainer brief
 */
export function buildWeeklyBriefEmail(data: WeeklyBriefData): { subject: string; html: string } {
  const frontendUrl = config.FRONTEND_URL;
  const briefUrl = `${frontendUrl}/repo/${data.repoId}`;
  const settingsUrl = `${frontendUrl}/repo/${data.repoId}/settings`;
  const frequency = data.schedule === 'biweekly' ? 'Bi-weekly' : 'Weekly';

  const subject = `${frequency} Brief: ${data.repoFullName} - ${data.date}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 16px; border: 1px solid #262626; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #262626;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 24px; font-weight: 700; color: #fafafa; margin-bottom: 8px;">
                      📋 ${frequency} Brief
                    </div>
                    <div style="font-size: 16px; color: #a1a1aa;">
                      ${data.repoFullName}
                    </div>
                    <div style="font-size: 14px; color: #71717a; margin-top: 4px;">
                      ${data.date}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TL;DR Section -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="font-size: 14px; font-weight: 600; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                TL;DR
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${data.tldr.map(item => `
                <tr>
                  <td style="padding: 8px 0; color: #e4e4e7; font-size: 15px; line-height: 1.6;">
                    <span style="color: #a78bfa; margin-right: 8px;">•</span>
                    ${escapeHtml(item)}
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>

          ${data.riskyChanges.length > 0 ? `
          <!-- Risky Changes Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                  ⚠️ Risky Changes
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${data.riskyChanges.map(item => `
                  <tr>
                    <td style="padding: 6px 0; color: #fca5a5; font-size: 14px; line-height: 1.5;">
                      • ${escapeHtml(item)}
                    </td>
                  </tr>
                  `).join('')}
                </table>
              </div>
            </td>
          </tr>
          ` : ''}

          ${data.suggestedActions.length > 0 ? `
          <!-- Suggested Actions Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 14px; font-weight: 600; color: #22c55e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                ✅ Suggested Actions
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${data.suggestedActions.slice(0, 3).map((item, idx) => `
                <tr>
                  <td style="padding: 8px 0; color: #e4e4e7; font-size: 14px; line-height: 1.5;">
                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #262626; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: #a1a1aa; margin-right: 12px;">${idx + 1}</span>
                    ${escapeHtml(item)}
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 8px 32px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 8px;">
                    <a href="${briefUrl}" style="display: block; text-align: center; padding: 14px 24px; background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
                      View Full Brief
                    </a>
                  </td>
                  <td style="padding-left: 8px;">
                    <a href="${briefUrl}?tab=issues" style="display: block; text-align: center; padding: 14px 24px; background-color: #262626; color: #fafafa; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid #3f3f46;">
                      Good First Issues
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #262626; background-color: #0a0a0a;">
              <div style="font-size: 13px; color: #71717a; line-height: 1.6;">
                You're receiving this because you enabled ${data.schedule} delivery for <strong style="color: #a1a1aa;">${data.repoFullName}</strong>.
                <br>
                <a href="${settingsUrl}" style="color: #a78bfa; text-decoration: none;">Manage notification settings →</a>
              </div>
            </td>
          </tr>

        </table>
        
        <!-- Logo/Brand -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td align="center">
              <div style="font-size: 14px; color: #52525b;">
                Powered by <strong style="color: #a78bfa;">RepoMind</strong>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts TL;DR bullets from maintainer brief markdown
 */
export function extractTldr(markdown: string): string[] {
  // Look for the Summary section
  const summaryMatch = markdown.match(/##\s*Summary\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (!summaryMatch) {
    // Fallback: try to find any bullet points at the start
    const bullets = markdown.match(/^[\s]*[-•*]\s*(.+)$/gm);
    if (bullets) {
      return bullets.slice(0, 5).map(b => b.replace(/^[\s]*[-•*]\s*/, '').trim());
    }
    return ['Analysis complete. View the full brief for details.'];
  }

  const summaryContent = summaryMatch[1];
  const bullets = summaryContent.match(/[-•*]\s*(.+)/g);
  
  if (!bullets) {
    // If no bullets, take first few sentences
    const sentences = summaryContent.split(/[.!?]+/).filter(s => s.trim());
    return sentences.slice(0, 5).map(s => s.trim());
  }

  return bullets.slice(0, 5).map(b => b.replace(/^[-•*]\s*/, '').trim());
}

/**
 * Extracts risky changes from maintainer brief markdown
 */
export function extractRiskyChanges(markdown: string): string[] {
  const riskyMatch = markdown.match(/##\s*Risky Changes\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (!riskyMatch) return [];

  const content = riskyMatch[1];
  const bullets = content.match(/[-•*]\s*(.+)/g);
  
  if (!bullets) return [];
  
  return bullets.slice(0, 4).map(b => b.replace(/^[-•*]\s*/, '').trim());
}

/**
 * Extracts suggested actions from maintainer brief markdown
 */
export function extractSuggestedActions(markdown: string): string[] {
  const actionsMatch = markdown.match(/##\s*Suggested Actions\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (!actionsMatch) return [];

  const content = actionsMatch[1];
  // Match numbered items or bullet points
  const items = content.match(/(?:\d+\.\s*|[-•*]\s*)(.+)/g);
  
  if (!items) return [];
  
  return items.slice(0, 3).map(item => item.replace(/^(?:\d+\.\s*|[-•*]\s*)/, '').trim());
}

