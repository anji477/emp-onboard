// CSRF token management
let csrfToken = null;

export const getCsrfToken = async () => {
  if (!csrfToken) {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const data = await response.json();
      csrfToken = data.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
    }
  }
  return csrfToken;
};

export const clearCsrfToken = () => {
  csrfToken = null;
};

export const fetchWithCsrf = async (url, options = {}) => {
  const token = await getCsrfToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token && options.method && options.method !== 'GET') {
    headers['X-CSRF-Token'] = token;
  }
  
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });
  
  // If CSRF token is invalid, clear it and retry once
  if (response.status === 403 && !options._retry) {
    clearCsrfToken();
    return fetchWithCsrf(url, { ...options, _retry: true });
  }
  
  return response;
};