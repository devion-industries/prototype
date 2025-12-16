import OpenAI from 'openai';
import config from '../config';
import { withRetry } from '../utils/retry';

let openaiClient: OpenAI;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generates text using OpenAI with retry logic
 */
export async function generateText(
  prompt: string,
  options: AIGenerationOptions = {}
): Promise<string> {
  const client = getOpenAIClient();

  const {
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  const result = await withRetry(
    async () => {
      const completion = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: 'You are a technical documentation expert who analyzes GitHub repositories and creates clear, actionable summaries for maintainers and contributors.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return completion.choices[0]?.message?.content || '';
    },
    {
      maxAttempts: 3,
      delayMs: 2000,
      shouldRetry: (error: any) => {
        // Retry on rate limit or server errors
        if (error.status === 429 || error.status >= 500) {
          return true;
        }
        return false;
      },
    }
  );

  return result;
}

export default getOpenAIClient;

