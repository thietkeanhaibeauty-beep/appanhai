/**
 * Parse Facebook access token from various formats
 * Supports: JSON, URL, and plain text formats
 */
export const parseToken = (rawInput: string): string => {
  const trimmed = rawInput.trim();

  // Format 1: JSON
  // Example: {"access_token":"EAA...","token_type":"bearer"}
  try {
    const json = JSON.parse(trimmed);
    if (json.access_token) {
      return json.access_token;
    }
  } catch {
    // Not JSON, continue to next format
  }

  // Format 2: URL with access_token parameter
  // Example: https://facebook.com/...?access_token=EAA...&other=params
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get('access_token');
    if (token) {
      return token;
    }
  } catch {
    // Not a valid URL, continue to next format
  }

  // Format 3: Plain text token
  // Example: EAAD6V7os0gcBP...
  if (trimmed.startsWith('EAA') || trimmed.length > 50) {
    return trimmed;
  }

  throw new Error('Không nhận diện được format token. Vui lòng paste token hợp lệ (JSON, URL hoặc plain text).');
};

/**
 * Validate token format (basic check)
 */
export const isValidTokenFormat = (token: string): boolean => {
  // Facebook tokens typically start with EAA and are quite long
  return token.startsWith('EAA') && token.length > 50;
};
