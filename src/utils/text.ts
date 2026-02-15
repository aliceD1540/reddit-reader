/**
 * Utility functions for text processing
 */

/**
 * Strips Reddit URLs from the given text.
 * Matches URLs starting with http(s)://(www.)?reddit.com or http(s)://(www.)?redd.it
 */
export function stripRedditUrls(text: string): string {
  // Regex to match Reddit URLs:
  // - reddit.com URLs (including subdomains like old.reddit.com)
  // - redd.it short URLs
  // The regex matches until a whitespace or end of string
  const redditUrlRegex = /https?:\/\/(?:[a-z0-9-]+\.)?reddit\.com\/\S*|https?:\/\/redd\.it\/\S*/gi;
  
  return text.replace(redditUrlRegex, '').trim();
}
