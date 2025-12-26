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
 * Modern design matching the Devion platform
 */
export function buildWeeklyBriefEmail(data: WeeklyBriefData): { subject: string; html: string } {
  const frontendUrl = config.FRONTEND_URL;
  const briefUrl = `${frontendUrl}/repo/${data.repoId}`;
  const settingsUrl = `${frontendUrl}/repo/${data.repoId}/settings`;
  const frequency = data.schedule === 'biweekly' ? 'Bi-weekly' : 'Weekly';

  const subject = `${data.repoFullName} — ${frequency} Brief`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">Devion</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 28px 28px 20px 28px;">
                    <div style="font-size: 12px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      ${frequency} Brief
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                      ${data.repoFullName}
                    </div>
                    <div style="font-size: 14px; color: #64748b;">
                      ${data.date}
                    </div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 28px;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                  </td>
                </tr>

                <!-- TL;DR Section -->
                <tr>
                  <td style="padding: 24px 28px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                      Summary
                    </div>
                    ${data.tldr.map(item => `
                    <div style="padding: 8px 0; color: #334155; font-size: 14px; line-height: 1.5;">
                      <span style="color: #3b82f6; margin-right: 8px;">→</span>${escapeHtml(item)}
                    </div>
                    `).join('')}
                  </td>
                </tr>

                ${data.riskyChanges.length > 0 ? `
                <!-- Risky Changes -->
                <tr>
                  <td style="padding: 0 28px 24px 28px;">
                    <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px;">
                      <div style="font-size: 11px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                        Needs Attention
                      </div>
                      ${data.riskyChanges.map(item => `
                      <div style="padding: 6px 0; color: #991b1b; font-size: 13px; line-height: 1.4;">
                        • ${escapeHtml(item)}
                      </div>
                      `).join('')}
                    </div>
                  </td>
                </tr>
                ` : ''}

                ${data.suggestedActions.length > 0 ? `
                <!-- Actions -->
                <tr>
                  <td style="padding: 0 28px 24px 28px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                      Suggested Actions
                    </div>
                    ${data.suggestedActions.slice(0, 3).map((item, idx) => `
                    <div style="padding: 8px 0; color: #334155; font-size: 13px; line-height: 1.4; display: flex; align-items: flex-start;">
                      <span style="display: inline-block; min-width: 20px; height: 20px; background-color: #f1f5f9; border-radius: 50%; text-align: center; line-height: 20px; font-size: 11px; font-weight: 600; color: #64748b; margin-right: 10px;">${idx + 1}</span>
                      ${escapeHtml(item)}
                    </div>
                    `).join('')}
                  </td>
                </tr>
                ` : ''}

                <!-- CTA Button -->
                <tr>
                  <td style="padding: 4px 28px 28px 28px;">
                    <a href="${briefUrl}" style="display: block; text-align: center; padding: 14px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View Full Analysis →
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ${data.schedule === 'manual' ? 'You ran this analysis manually.' : `You're receiving ${data.schedule} briefs for this repo.`}
                <br>
                <a href="${settingsUrl}" style="color: #64748b; text-decoration: underline;">Manage settings</a>
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
