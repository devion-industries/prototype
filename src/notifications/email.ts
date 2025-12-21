import { Resend } from 'resend';
import config from '../config';

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!config.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured, email notifications disabled');
    return null;
  }

  if (!resend) {
    resend = new Resend(config.RESEND_API_KEY);
  }

  return resend;
}

/**
 * Sends a plain text email
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const client = getResendClient();
  
  if (!client) {
    console.log('📧 [DEV] Email would be sent to:', to);
    console.log('   Subject:', subject);
    return;
  }

  try {
    const { data, error } = await client.emails.send({
      from: config.FROM_EMAIL,
      to,
      subject,
      text: body,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`📧 Email sent to ${to} (ID: ${data?.id})`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Sends an HTML email (for rich weekly briefs)
 */
export async function sendHtmlEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const client = getResendClient();
  
  if (!client) {
    console.log('📧 [DEV] HTML Email would be sent to:', to);
    console.log('   Subject:', subject);
    return;
  }

  try {
    const { data, error } = await client.emails.send({
      from: config.FROM_EMAIL,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`📧 HTML Email sent to ${to} (ID: ${data?.id})`);
  } catch (error) {
    console.error('Failed to send HTML email:', error);
    throw error;
  }
}

/**
 * Simple HTML to text converter for fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}
