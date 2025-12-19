/**
 * Sends a message to Slack webhook
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: string
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    console.log('💬 Slack notification sent');
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    throw error;
  }
}


