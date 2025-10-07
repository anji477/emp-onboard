// Safe JSON parsing utility
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    // If it's already an object (but not null), return it
    if (typeof jsonString === 'object' && jsonString !== null) {
      return jsonString;
    }
    // If it's null or undefined, return default
    if (jsonString == null) {
      return defaultValue;
    }
    // If it's a string, parse it
    if (typeof jsonString === 'string') {
      // Don't try to parse empty strings
      if (jsonString.trim() === '') {
        return defaultValue;
      }
      return JSON.parse(jsonString);
    }
    // For other types (numbers, booleans, etc.), return default
    console.warn('Unexpected type for JSON parsing:', typeof jsonString, jsonString);
    return defaultValue;
  } catch (error) {
    console.error('JSON parsing error:', error.message, 'Input type:', typeof jsonString, 'Input value:', jsonString);
    return defaultValue;
  }
};

export const safeJsonStringify = (obj, defaultValue = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('JSON stringify error:', error.message);
    return defaultValue;
  }
};