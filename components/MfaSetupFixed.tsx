import React, { useState, useEffect } from 'react';

interface MfaSetupData {
  sessionId: string;
  qrCode: string;
  secret: string;
  expiresIn: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  requireRestart?: boolean;
  sessionId?: string;
  qrCode?: string;
  secret?: string;
  expiresIn?: number;
  backupCodes?: string[];
}

const MfaSetupFixed: React.FC = () => {
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);

  const initiateMfaSetup = async () => {
    setIsLoading(true);
    setError('');
    setSessionExpired(false);
    
    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.sessionId && data.qrCode) {
        setSetupData({
          sessionId: data.sessionId,
          qrCode: data.qrCode,
          secret: data.secret || '',
          expiresIn: data.expiresIn || 1800
        });
      } else {
        setError(data.message || 'Failed to initiate MFA setup');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfaCode = async () => {
    if (!verificationCode || !setupData) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/mfa/verify-setup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: setupData.sessionId,
          code: verificationCode
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setBackupCodes(data.backupCodes || []);
        setSetupComplete(true);
      } else {
        if (data.requireRestart) {
          setSessionExpired(true);
        } else {
          setError(data.message || 'Invalid verification code');
        }
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const restartMfaSetup = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/restart-setup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.sessionId && data.qrCode) {
        setSetupData({
          sessionId: data.sessionId,
          qrCode: data.qrCode,
          secret: data.secret || '',
          expiresIn: data.expiresIn || 1800
        });
        setSessionExpired(false);
        setVerificationCode('');
      } else {
        setError(data.message || 'Failed to restart MFA setup');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initiateMfaSetup();
  }, []);

  if (setupComplete) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">MFA Setup Complete!</h3>
          <p className="text-sm text-gray-600 mb-4">Save these backup codes in a secure location:</p>
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            {backupCodes.map((code, index) => (
              <div key={index} className="font-mono text-sm">{code}</div>
            ))}
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (sessionExpired || (!setupData && !isLoading)) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No active MFA setup session found
          </h3>
          
          <p className="text-sm text-gray-500 mb-6">
            Your MFA setup session has expired or is invalid. Please restart the setup.
          </p>
          
          <button
            onClick={restartMfaSetup}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Restarting...' : 'Restart MFA Setup'}
          </button>
        </div>
      </div>
    );
  }

  if (!setupData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-center mb-6">Set up Multi-Factor Authentication</h2>
      
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Scan this QR code with your authenticator app:
        </p>
        <img src={setupData.qrCode} alt="MFA QR Code" className="mx-auto mb-4" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter verification code:
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        onClick={verifyMfaCode}
        disabled={isLoading || !verificationCode}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Verifying...' : 'Verify and Complete Setup'}
      </button>
    </div>
  );
};

export default MfaSetupFixed;