import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MfaSetupData {
  sessionToken: string;
  secret: string;
  qrCodeUrl: string;
  accountName: string;
  issuer: string;
  userEmail: string;
}

interface MfaSetupProps {
  sessionToken?: string;
  userEmail?: string;
  onSuccess?: (userData: any) => void;
  isRequired?: boolean;
}

const MfaSetup: React.FC<MfaSetupProps> = ({ 
  sessionToken, 
  userEmail, 
  onSuccess, 
  isRequired = false 
}) => {
  const [step, setStep] = useState(1);
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [currentSessionToken, setCurrentSessionToken] = useState(sessionToken);

  useEffect(() => {
    if (isRequired && sessionToken) {
      setCurrentSessionToken(sessionToken);
      validateSession();
    } else if (userEmail) {
      startMfaSetup();
    }
  }, [isRequired, sessionToken, userEmail]);

  const selectAuthenticatorMethod = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          sessionToken: currentSessionToken,
          method: 'authenticator'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSetupData(prev => ({ ...prev, ...data }));
        setStep(2);
      } else {
        const error = await response.json();
        if (error.expired) {
          setSessionExpired(true);
        }
        setError(error.message || 'Failed to setup authenticator');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startMfaSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/start-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userEmail })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
        setCurrentSessionToken(data.sessionToken);
        setSessionExpired(false);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to start MFA setup');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const validateSession = async () => {
    if (!currentSessionToken) {
      setSessionExpired(true);
      return;
    }
    
    try {
      const response = await fetch('/api/mfa/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionToken: currentSessionToken })
      });
      
      const data = await response.json();
      
      if (!data.valid || data.expired) {
        setSessionExpired(true);
        setError('Setup session has expired');
      } else {
        setSessionExpired(false);
        setError('');
      }
    } catch (error) {
      setSessionExpired(true);
      setError('Session validation failed');
    }
  };

  const restartSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/restart-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionToken: currentSessionToken,
          userEmail: userEmail
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
        setCurrentSessionToken(data.sessionToken);
        setSessionExpired(false);
        setError('');
        setStep(1);
        setSuccess('New QR code generated!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const error = await response.json();
        if (error.requiresLogin) {
          window.location.href = '/login';
        } else {
          setError(error.message || 'Failed to restart setup');
        }
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionToken: currentSessionToken,
          code: verificationCode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setSuccess('MFA setup completed successfully!');
        setStep(4);
        
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(null);
          }, 2000);
        }
      } else {
        const error = await response.json();
        if (error.expired) {
          setSessionExpired(true);
          setError('Setup session has expired');
        } else {
          setError(error.message || 'Invalid verification code');
        }
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading && !setupData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up MFA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Set Up Multi-Factor Authentication</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
          {sessionExpired && (
            <button
              onClick={restartSetup}
              disabled={loading}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate New QR Code'}
            </button>
          )}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Step 1: Method Selection */}
      {step === 1 && setupData && !sessionExpired && (
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-4">Choose MFA Method</h2>
          <p className="text-sm text-gray-600 mb-6">
            Select how you want to receive verification codes
          </p>
          
          <button
            onClick={selectAuthenticatorMethod}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded hover:bg-indigo-700 disabled:opacity-50 mb-4"
          >
            {loading ? 'Setting up...' : '📱 Authenticator App'}
          </button>
          
          <p className="text-xs text-gray-500">
            Use Google Authenticator, Microsoft Authenticator, or similar apps
          </p>
        </div>
      )}

      {/* Step 2: QR Code & Manual Entry */}
      {step === 2 && setupData && !sessionExpired && (
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-4">Scan QR Code or Enter Manually</h2>
          
          {/* QR Code */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Option 1: Scan QR Code</h3>
            <div className="bg-white p-4 rounded-lg inline-block border">
              <QRCodeSVG value={setupData.qrCodeUrl} size={200} />
            </div>
          </div>

          {/* Manual Entry */}
          <div className="mb-6 text-left">
            <h3 className="font-medium mb-2">Option 2: Manual Entry</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Account Name:</label>
                <div className="flex items-center justify-between">
                  <code className="text-sm bg-white px-2 py-1 rounded border flex-1 mr-2">
                    {setupData.accountName}
                  </code>
                  <button
                    onClick={() => copyToClipboard(setupData.accountName)}
                    className="text-indigo-600 hover:text-indigo-800"
                    title="Copy account name"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 block mb-1">Secret Key:</label>
                <div className="flex items-center justify-between">
                  <code className="text-sm bg-white px-2 py-1 rounded border flex-1 mr-2 break-all">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(setupData.secret)}
                    className="text-indigo-600 hover:text-indigo-800"
                    title="Copy secret key"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-left mb-6">
            <h3 className="font-medium mb-2">Recommended Apps:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Google Authenticator</li>
              <li>• Microsoft Authenticator</li>
              <li>• Authy</li>
            </ul>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
          >
            I've Added the Account
          </button>
        </div>
      )}

      {/* Step 3: Verification */}
      {step === 3 && !sessionExpired && (
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-4">Verify Setup</h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter the 6-digit code from your authenticator app
          </p>

          <input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
              setError('');
            }}
            placeholder="000000"
            className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border rounded-md mb-6"
            maxLength={6}
          />

          <div className="flex space-x-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            >
              Back
            </button>
            <button
              onClick={verifySetup}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Backup Codes */}
      {step === 4 && (
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-4">Save Your Backup Codes</h2>
          <p className="text-sm text-gray-600 mb-6">
            Store these codes safely. Each can only be used once.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white p-2 rounded text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 mb-6">
            <button
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            >
              Copy Codes
            </button>
            <button
              onClick={() => {
                const element = document.createElement('a');
                const file = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
                element.href = URL.createObjectURL(file);
                element.download = 'mfa-backup-codes.txt';
                element.click();
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            >
              Download
            </button>
          </div>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Complete Setup
          </button>
        </div>
      )}

      {/* Session Expired State */}
      {sessionExpired && (
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <h2 className="text-lg font-semibold mb-2">Setup Session Expired</h2>
            <p className="text-sm">Your session has expired. Generate a new QR code to continue.</p>
          </div>
          
          <button
            onClick={restartSetup}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate New QR Code'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MfaSetup;