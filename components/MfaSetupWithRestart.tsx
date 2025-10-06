import React, { useState, useEffect } from 'react';
import MfaSetupExpired from './MfaSetupExpired';

interface MfaSetupData {
  sessionId: string;
  qrCode: string;
  secret: string;
  expiresIn: number;
}

const MfaSetupWithRestart: React.FC = () => {
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

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

      const data = await response.json();

      if (data.success) {
        setSetupData(data);
        setSessionExpired(false);
      } else {
        setError(data.message || 'Failed to restart MFA setup');
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

      const data = await response.json();

      if (data.success) {
        // MFA setup complete - redirect or show success
        window.location.href = '/dashboard';
      } else {
        if (data.message?.includes('expired') || data.message?.includes('invalid session')) {
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

  // Initial setup attempt
  useEffect(() => {
    restartMfaSetup();
  }, []);

  if (sessionExpired || (!setupData && !isLoading)) {
    return <MfaSetupExpired onRestart={restartMfaSetup} isLoading={isLoading} />;
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
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Verifying...' : 'Verify and Complete Setup'}
      </button>
    </div>
  );
};

export default MfaSetupWithRestart;