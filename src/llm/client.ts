// LLM Provider Client
// Abstraction layer for switching between Gemini and Groq

import { Env } from '../types';
import * as GeminiClient from '../gemini/client';
import * as GroqClient from '../groq/client';
import { Logger } from '../utils/logger';

const logger = new Logger('LLMClient');

/**
 * Generate a comment using the configured LLM provider
 */
export async function generateComment(
  env: Env,
  redditPostContent: string,
  redditPermalink: string
): Promise<string> {
  const provider = env.LLM_PROVIDER?.toLowerCase() || 'gemini';
  
  logger.info(`Using LLM provider: ${provider}`);
  
  switch (provider) {
    case 'groq':
      return await GroqClient.generateComment(env, redditPostContent, redditPermalink);
    
    case 'gemini':
    default:
      return await GeminiClient.generateComment(env, redditPostContent, redditPermalink);
  }
}
