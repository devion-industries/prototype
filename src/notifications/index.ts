import { sendEmail } from './email';
import { sendSlackMessage } from './slack';

export interface EmailNotification {
  type: 'email';
  to: string;
  subject: string;
  body: string;
}

export interface SlackNotification {
  type: 'slack';
  webhookUrl: string;
  message: string;
}

export type Notification = EmailNotification | SlackNotification;

/**
 * Sends a notification (email or Slack)
 */
export async function sendNotification(notification: Notification): Promise<void> {
  try {
    if (notification.type === 'email') {
      await sendEmail(notification.to, notification.subject, notification.body);
    } else if (notification.type === 'slack') {
      await sendSlackMessage(notification.webhookUrl, notification.message);
    }
  } catch (error) {
    console.error('Notification failed:', error);
    throw error;
  }
}


