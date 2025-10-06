// components/MfaSetup.tsx
import React, { useState, useEffect } from 'react';
import { QrCodeIcon, KeyIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MfaSetupProps {
  userEmail: string;
  userName: string;
  onComplete: () => void;
}

interface SetupData {
  sessionId: string;
  sessionToken?: string;
  secret: string;
  qrCode: string;
  qrCodeUrl?: string;
  accountName?: string;
  issuer?: string;
}

const MfaSetup: React.FC<MfaSetupProps> = ({ userEmail, userName, onComplete }) => {
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    startMfaSetup();
  }, []);

  const startMfaSetup = async () => {
    setLoading(true);
    setError('');
    setSessionExpired(false);

    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSetupData({
          sessionId: data.sessionId,
          secret: data.secret,
          qrCode: data.qrCode
        });
      } else {
        setError(data.message || 'Failed to start MFA setup');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateSession = async () => {
    if (!setupData?.sessionId) return false;

    try {
      const response = await fetch('/api/mfa/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionToken: setupData.sessionId })
      });

      const data = await response.json();
      return data.valid;
    } catch {
      return false;
    }
  };

  const verifySetup = async () => {
    if (!setupData || !verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    // Validate session before verification
    const isValid = await validateSession();
    if (!isValid) {
      setSessionExpired(true);
      setError('Setup session has expired. Please generate a new QR code.');
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
          sessionId: setupData.sessionId,
          code: verificationCode.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setBackupCodes(data.backupCodes || []);
        setShowBackupCodes(true);
      } else {
        if (data.expired) {
          setSessionExpired(true);
        }
        setError(data.message || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeMfaSetup = () => {
    onComplete();
  };

  if (loading && !setupData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up MFA...</p>
        </div>
      </div>
    );
  }

  if (showBackupCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">MFA Setup Complete!</h2>
            <p className="mt-2 text-sm text-gray-600">
              Save these backup codes in a secure location
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Codes</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-gray-100 p-2 rounded text-center font-mono text-sm">
                  {code}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Each backup code can only be used once. Store them securely and use them if you lose access to your authenticator app.
            </p>
            <button
              onClick={completeMfaSetup}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <QrCodeIcon className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Setup Two-Factor Authentication</h2>
          <p className="mt-2 text-sm text-gray-600">
            MFA is required for your role. Please set up an authenticator app.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {sessionExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Your setup session has expired. Click "Generate New QR Code" to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {setupData && !sessionExpired ? (
            <>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Scan QR Code</h3>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  <img 
                    src={setupData.qrCode}
                    alt="MFA QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Scan with Google Authenticator, Authy, or similar app
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <KeyIcon className="h-4 w-4 mr-2" />
                  Manual Entry
                </h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Secret: <span className="font-mono">{setupData.secret}</span></p>
                </div>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Enter verification code from your app
                </label>
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg font-mono"
                  maxLength={6}
                />
              </div>

              <button
                onClick={verifySetup}
                disabled={loading || verificationCode.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Complete Setup'}
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {sessionExpired ? 'Session expired. Generate a new QR code to continue.' : 'Click below to generate your QR code.'}
              </p>
              <button
                onClick={startMfaSetup}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate New QR Code'}
              </button>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Session expires in 30 minutes. You must complete setup to access the system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MfaSetup;