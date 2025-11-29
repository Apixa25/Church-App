/**
 * Utility functions for emoji validation and handling
 */

/**
 * Check if a string contains only emojis (and whitespace)
 * @param str - The string to check
 * @returns true if the string contains only emojis
 */
export const isOnlyEmojis = (str: string): boolean => {
  if (!str || str.trim().length === 0) {
    return false;
  }

  // Remove whitespace for checking
  const withoutWhitespace = str.replace(/\s/g, '');
  if (withoutWhitespace.length === 0) {
    return false;
  }

  // Comprehensive emoji regex pattern
  // This covers most emoji ranges including:
  // - Emoticons (😀-😿)
  // - Miscellaneous Symbols and Pictographs (🌀-🗿)
  // - Supplemental Symbols and Pictographs (🩷-🫨)
  // - Symbols and Pictographs Extended-A (🪿-🫸)
  // - And more...
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier_Base}\p{Emoji_Component}]+$/u;
  
  return emojiRegex.test(withoutWhitespace);
};

/**
 * Count the number of emojis in a string
 * @param str - The string to count emojis in
 * @returns The number of emoji characters
 */
export const countEmojis = (str: string): number => {
  if (!str) return 0;
  
  // Match emoji sequences
  const emojiMatches = str.match(/[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier_Base}]/gu);
  return emojiMatches ? emojiMatches.length : 0;
};

/**
 * Remove all emojis from a string
 * @param str - The string to remove emojis from
 * @returns The string with emojis removed
 */
export const removeEmojis = (str: string): string => {
  if (!str) return '';
  return str.replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier_Base}\p{Emoji_Component}]/gu, '');
};

/**
 * Generate a unique slug from a UUID-like string
 * Used for emoji-based family group names
 * @returns A unique slug string
 */
export const generateUniqueSlug = (): string => {
  // Use crypto.randomUUID() if available (modern browsers)
  // Otherwise generate a random string
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID();
    return `family-${uuid.substring(0, 8)}`;
  }
  
  // Fallback: generate random alphanumeric string
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'family-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

