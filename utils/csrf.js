// CSRF token management
let csrfToken = null;

export const getCsrfToken = async () => {
  if (!csrfToken) {
    try {
      const csrfEndpoint = process.env.CSRF_TOKEN_ENDPOINT || '/api/csrf-token';
      const response = await fetch(csrfEndpoint, {
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
    const csrfHeader = process.env.CSRF_HEADER_NAME || 'X-CSRF-Token';
    headers[csrfHeader] = token;
  }
  
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });
  
  // If CSRF token is invalid, clear it and retry once
  const csrfFailureStatus = parseInt(process.env.CSRF_FAILURE_STATUS) || 403;
  if (response.status === csrfFailureStatus && !options._retry) {
    clearCsrfToken();
    return fetchWithCsrf(url, { ...options, _retry: true });
  }
  
  return response;
};