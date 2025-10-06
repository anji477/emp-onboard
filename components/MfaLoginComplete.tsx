import React, { useState } from 'react';

interface MfaLoginProps {
  email: string;
  password: string;
  onSuccess: (user: any) => void;
  onBack: () => void;
}

const MfaLoginComplete: React.FC<MfaLoginProps> = ({ email, password, onSuccess, onBack }) => {
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mfaCode || (useBackupCode ? mfaCode.length !== 8 : !/^\d{6}$/.test(mfaCode))) {
      setError(useBackupCode ? 'Please enter a valid backup code' : 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          mfaCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success) {
        onSuccess(data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">
        Enter Authentication Code
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {useBackupCode ? 'Backup Code' : 'Authentication Code'}
          </label>
          <input
            type="text"
            value={mfaCode}
            onChange={(e) => {
              const value = useBackupCode 
                ? e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8)
                : e.target.value.replace(/\D/g, '').slice(0, 6);
              setMfaCode(value);
              setError('');
            }}
            placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
            className="w-full text-center text-2xl font-mono tracking-widest p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={useBackupCode ? 8 : 6}
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setMfaCode('');
              setError('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
          </button>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !mfaCode || (useBackupCode ? mfaCode.length !== 8 : mfaCode.length !== 6)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          {useBackupCode 
            ? 'Enter one of your 8-character backup codes'
            : 'Enter the 6-digit code from your authenticator app'
          }
        </p>
      </div>
    </div>
  );
};

export default MfaLoginComplete;