# CSRF Protection Implementation

## Overview
CSRF (Cross-Site Request Forgery) protection has been implemented to secure all state-changing endpoints.

## How It Works

### Server-Side
- All POST/PUT/DELETE requests require a valid CSRF token
- Tokens are generated per user/session and expire after 1 hour
- Public endpoints (login, password reset, etc.) are exempt from CSRF protection

### Client-Side Usage

#### 1. Import the CSRF utility
```javascript
import { fetchWithCsrf } from '../utils/csrf.js';
```

#### 2. Use fetchWithCsrf instead of fetch for API calls
```javascript
// Instead of:
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData)
});

// Use:
const response = await fetchWithCsrf('/api/users', {
  method: 'POST',
  body: JSON.stringify(userData)
});
```

#### 3. Manual token handling (if needed)
```javascript
import { getCsrfToken } from '../utils/csrf.js';

const token = await getCsrfToken();
const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify(userData)
});
```

## Protected Endpoints
All POST/PUT/DELETE endpoints are protected except:
- `/api/login`
- `/api/verify-token/*`
- `/api/setup-password`
- `/api/forgot-password`
- `/api/reset-password`
- `/api/maintenance-status`

## Error Handling
- 403 status with "CSRF token missing" - Include X-CSRF-Token header
- 403 status with "CSRF token expired" - Get new token from `/api/csrf-token`
- 403 status with "Invalid CSRF token" - Get new token and retry

The `fetchWithCsrf` utility handles token refresh automatically.