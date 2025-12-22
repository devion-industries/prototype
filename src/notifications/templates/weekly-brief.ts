import config from '../../config';

export interface WeeklyBriefData {
  repoFullName: string;
  repoId: string;
  date: string;
  tldr: string[];
  riskyChanges: string[];
  suggestedActions: string[];
  schedule: 'weekly' | 'biweekly' | 'manual';
}

/**
 * Builds the HTML email for weekly/biweekly maintainer brief
 * Light theme matching the RepoMind platform UI
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 24px;">📋</span>
                      </div>
                    </div>
                    <div style="font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
                      ${frequency} Brief
                    </div>
                    <div style="font-size: 16px; color: #475569; font-weight: 500;">
                      ${data.repoFullName}
                    </div>
                    <div style="font-size: 14px; color: #94a3b8; margin-top: 4px;">
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
              <div style="font-size: 12px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                TL;DR
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${data.tldr.map(item => `
                <tr>
                  <td style="padding: 10px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                    <span style="color: #6366f1; margin-right: 10px; font-weight: 600;">•</span>
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
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                  ⚠️ Risky Changes
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${data.riskyChanges.map(item => `
                  <tr>
                    <td style="padding: 8px 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
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
              <div style="font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                ✅ Suggested Actions
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${data.suggestedActions.slice(0, 3).map((item, idx) => `
                <tr>
                  <td style="padding: 10px 0; color: #334155; font-size: 14px; line-height: 1.5;">
                    <span style="display: inline-block; width: 26px; height: 26px; background-color: #f1f5f9; border-radius: 50%; text-align: center; line-height: 26px; font-size: 13px; font-weight: 600; color: #64748b; margin-right: 12px;">${idx + 1}</span>
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
                  <td style="padding-right: 8px; width: 50%;">
                    <a href="${briefUrl}" style="display: block; text-align: center; padding: 14px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
                      View Full Brief
                    </a>
                  </td>
                  <td style="padding-left: 8px; width: 50%;">
                    <a href="${briefUrl}?tab=issues" style="display: block; text-align: center; padding: 14px 24px; background-color: #f1f5f9; color: #334155; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid #e2e8f0;">
                      Good First Issues
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
              <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
                You're receiving this because you enabled ${data.schedule} delivery for <strong style="color: #475569;">${data.repoFullName}</strong>.
                <br>
                <a href="${settingsUrl}" style="color: #6366f1; text-decoration: none; font-weight: 500;">Manage notification settings →</a>
              </div>
            </td>
          </tr>

        </table>
        
        <!-- Logo/Brand -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td align="center">
              <div style="font-size: 14px; color: #94a3b8;">
                Powered by <strong style="color: #6366f1;">RepoMind</strong>
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
  // Look for TL;DR or Summary section
  const tldrMatch = markdown.match(/##\s*(?:TL;DR|Summary|Overview)\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (tldrMatch) {
    const content = tldrMatch[1];
    const bullets = content.match(/[-•*]\s*(.+)/g);
    if (bullets) {
      return bullets.slice(0, 5).map(b => b.replace(/^[-•*]\s*/, '').trim());
    }
  }
  
  // Fallback: try to find any bullet points at the start
  const bullets = markdown.match(/^[\s]*[-•*]\s*(.+)$/gm);
  if (bullets) {
    return bullets.slice(0, 5).map(b => b.replace(/^[\s]*[-•*]\s*/, '').trim());
  }
  
  return ['Analysis complete. View the full brief for details.'];
}

/**
 * Extracts risky changes from maintainer brief markdown
 */
export function extractRiskyChanges(markdown: string): string[] {
  const riskyMatch = markdown.match(/##\s*(?:Risky Changes|Risk|Risks|Concerns)\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
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
  const actionsMatch = markdown.match(/##\s*(?:Suggested Actions|Actions|Recommendations|Next Steps)\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (!actionsMatch) return [];

  const content = actionsMatch[1];
  // Match numbered items or bullet points
  const items = content.match(/(?:\d+\.\s*|[-•*]\s*)(.+)/g);
  
  if (!items) return [];
  
  return items.slice(0, 3).map(item => item.replace(/^(?:\d+\.\s*|[-•*]\s*)/, '').trim());
}
