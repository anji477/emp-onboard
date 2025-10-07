import React, { useState, useEffect } from 'react';

interface MfaSetupProps {
  onComplete: (success: boolean) => void;
}

const MfaSetupComplete: React.FC<MfaSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setupMfa();
  }, []);

  const setupMfa = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Setup failed');
      
      const data = await response.json();
      setSessionId(data.sessionId);
      setQrCode(data.qrCode);
      setManualKey(data.manualEntryKey);
    } catch (err) {
      setError('Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          code: verificationCode
        })
      });
      
      if (!response.ok) throw new Error('Verification failed');
      
      const data = await response.json();
      setBackupCodes(data.backupCodes);
      setStep(3);
    } catch (err) {
      setError('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && step === 1) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Setting up MFA...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">
        Set Up Multi-Factor Authentication
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {step === 1 && (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Scan this QR code with your authenticator app
          </p>
          {qrCode && (
            <div className="mb-4">
              <img src={qrCode} alt="MFA QR Code" className="mx-auto" />
            </div>
          )}
          <div className="bg-gray-50 p-3 rounded-md mb-4">
            <p className="text-xs text-gray-500 mb-1">Manual entry key:</p>
            <code className="text-sm font-mono break-all">{manualKey}</code>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            I've Added the Account
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-gray-600 mb-4 text-center">
            Enter the 6-digit code from your authenticator app
          </p>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            placeholder="000000"
            className="w-full text-center text-2xl font-mono tracking-widest p-3 border border-gray-300 rounded-md mb-4"
            maxLength={6}
          />
          <div className="flex space-x-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Back
            </button>
            <button
              onClick={verifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <div className="text-green-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-4">MFA Setup Complete!</h3>
          <p className="text-gray-600 mb-4">
            Save these backup codes in a safe place. Each can only be used once.
          </p>
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              {backupCodes.map((code, index) => (
                <div key={index} className="text-center p-1 bg-white rounded">
                  {code}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={downloadBackupCodes}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Download Backup Codes
            </button>
            <button
              onClick={() => onComplete(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MfaSetupComplete;