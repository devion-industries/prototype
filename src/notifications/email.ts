import * as nodemailer from 'nodemailer';
import config from '../config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.SMTP_HOST || !config.SMTP_USER) {
    console.warn('Email not configured, skipping email notification');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

/**
 * Sends an email
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const transport = getTransporter();
  
  if (!transport) {
    console.log('Email would be sent to:', to);
    return;
  }

  try {
    await transport.sendMail({
      from: config.FROM_EMAIL || config.SMTP_USER,
      to,
      subject,
      text: body,
    });

    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

