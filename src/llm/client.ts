// LLM Provider Client
// Abstraction layer for switching between Gemini, Groq, and Cloudflare Workers AI
// Supports fallback on 429 errors

import { Env } from '../types';
import * as GeminiClient from '../gemini/client';
import * as GroqClient from '../groq/client';
import * as CloudflareClient from '../cloudflare/client';
import { Logger } from '../utils/logger';

const logger = new Logger('LLMClient');

type LLMProvider = 'gemini' | 'groq' | 'cloudflare';

interface ProviderError {
  provider: LLMProvider;
  error: Error;
  is429: boolean;
}

/**
 * Check if error is a 429 (rate limit) error
 */
function is429Error(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  return errorMessage.includes('429') || errorMessage.includes('rate limit');
}

/**
 * Get the priority list of LLM providers from environment
 */
function getProviderPriority(env: Env): LLMProvider[] {
  // Use LLM_PRIORITY if set, otherwise fall back to LLM_PROVIDER for backward compatibility
  const priorityString = env.LLM_PRIORITY || env.LLM_PROVIDER || 'cloudflare,groq,gemini';
  
  const providers = priorityString
    .toLowerCase()
    .split(',')
    .map(p => p.trim())
    .filter(p => ['gemini', 'groq', 'cloudflare'].includes(p)) as LLMProvider[];
  
  // Default if no valid providers
  if (providers.length === 0) {
    logger.warn('No valid LLM providers configured, using default priority');
    return ['cloudflare', 'groq', 'gemini'];
  }
  
  logger.info(`LLM provider priority: ${providers.join(' -> ')}`);
  return providers;
}

/**
 * Try to generate comment with a specific provider
 */
async function tryProvider(
  provider: LLMProvider,
  env: Env,
  redditPostContent: string,
  redditPermalink: string
): Promise<string> {
  logger.info(`Attempting to generate comment with: ${provider}`);
  
  switch (provider) {
    case 'cloudflare':
      return await CloudflareClient.generateComment(env, redditPostContent, redditPermalink);
    case 'groq':
      return await GroqClient.generateComment(env, redditPostContent, redditPermalink);
    case 'gemini':
      return await GeminiClient.generateComment(env, redditPostContent, redditPermalink);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Generate a comment using the configured LLM provider with fallback support
 * Will try providers in priority order, falling back on 429 errors
 */
export async function generateComment(
  env: Env,
  redditPostContent: string,
  redditPermalink: string
): Promise<string> {
  const providers = getProviderPriority(env);
  const errors: ProviderError[] = [];
  
  for (const provider of providers) {
    try {
      const result = await tryProvider(provider, env, redditPostContent, redditPermalink);
      
      // Log if we had to fall back
      if (errors.length > 0) {
        logger.info(`Successfully generated comment after ${errors.length} failed attempt(s)`);
      }
      
      return result;
    } catch (error) {
      const err = error as Error;
      const is429 = is429Error(err);
      
      errors.push({
        provider,
        error: err,
        is429,
      });
      
      logger.warn(`Provider ${provider} failed`, { 
        error: err.message, 
        is429,
        remainingProviders: providers.length - errors.length
      });
      
      // If not a 429 error or no more providers, throw
      if (!is429 || errors.length === providers.length) {
        break;
      }
      
      // Continue to next provider on 429 error
      logger.info(`Falling back to next provider due to rate limit`);
    }
  }
  
  // All providers failed
  const errorSummary = errors
    .map(e => `${e.provider}: ${e.error.message}`)
    .join('; ');
  
  logger.error('All LLM providers failed', { errors: errorSummary });
  throw new Error(`All LLM providers failed. Errors: ${errorSummary}`);
}
