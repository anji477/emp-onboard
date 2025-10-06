// Safe JSON parsing utility
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing error:', error.message);
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