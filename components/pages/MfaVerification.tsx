import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Loader from '../common/Loader';

interface MfaVerificationProps {
  userEmail: string;
  onSuccess: (userData: any) => void;
  onSetupRequired: () => void;
}

const MfaVerification: React.FC<MfaVerificationProps> = ({ 
  userEmail, 
  onSuccess, 
  onSetupRequired 
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [showBackupCode, setShowBackupCode] = useState(false);

  // Get CSRF token on component mount
  useEffect(() => {
    const getCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
      }
    };
    getCsrfToken();
  }, []);

  const verifyMfaCode = async () => {
    if (!verificationCode) {
      setError(showBackupCode ? 'Please enter a backup code' : 'Please enter a verification code');
      return;
    }
    
    if (showBackupCode && !/^[A-Fa-f0-9]{8}$/.test(verificationCode)) {
      setError('Please enter a valid 8-character backup code');
      return;
    }
    
    if (!showBackupCode && !/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Sending MFA verification:', { email: userEmail, token: verificationCode });
      const response = await fetch('/api/mfa/verify-login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ 
          email: userEmail,
          token: verificationCode 
        })
      });
      
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setError('Server response error. Please try again.');
        return;
      }
      
      if (response.ok) {
        setSuccess('MFA verification successful!');
        setTimeout(() => {
          onSuccess(data.user);
        }, 1000);
      } else {
        if (data.setupRequired) {
          onSetupRequired();
          return;
        }
        
        setError(data.message || 'Invalid verification code');
        setRemainingAttempts(prev => Math.max(0, prev - 1));
        
        if (remainingAttempts <= 1) {
          setError('Too many failed attempts. Please try again later.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    const expectedLength = showBackupCode ? 8 : 6;
    if (e.key === 'Enter' && verificationCode.length === expectedLength) {
      verifyMfaCode();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="shield-check" className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Signing in as: <span className="font-medium">{userEmail}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <Icon name="exclamation-triangle" className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <Icon name="check-circle" className="h-5 w-5 text-green-400 mr-2" />
              <div className="text-sm text-green-700">{success}</div>
            </div>
          </div>
        )}

        <Card>
          <div className="text-center">
            <div className="mb-6">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = showBackupCode 
                    ? e.target.value.replace(/[^A-Fa-f0-9]/g, '').slice(0, 8).toUpperCase()
                    : e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder={showBackupCode ? "A1B2C3D4" : "000000"}
                className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                maxLength={showBackupCode ? 8 : 6}
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                {showBackupCode 
                  ? 'Enter one of your 8-character backup codes'
                  : 'Enter the 6-digit code from your authenticator app'
                }
              </p>
            </div>
            
            <Button 
              onClick={verifyMfaCode}
              disabled={loading || verificationCode.length !== (showBackupCode ? 8 : 6)}
              fullWidth
              className="mb-4"
            >
              {loading ? <Loader size="sm" color="white" /> : 'Verify & Sign In'}
            </Button>
            
            <div className="text-center mb-4">
              <button
                onClick={() => {
                  setShowBackupCode(!showBackupCode);
                  setVerificationCode('');
                  setError('');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                type="button"
              >
                {showBackupCode 
                  ? '← Use authenticator app code'
                  : 'Use backup code instead'
                }
              </button>
              
              {showBackupCode && (
                <div className="mt-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/mfa/verify-login', {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                          },
                          credentials: 'include',
                          body: JSON.stringify({ 
                            email: userEmail,
                            token: 'TEST_BACKUP_CODES'
                          })
                        });
                        const data = await response.json();
                        console.log('Backup codes test:', data);
                        alert('Check console for backup codes info');
                      } catch (error) {
                        console.error('Test failed:', error);
                      }
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    type="button"
                  >
                    Test Backup Codes
                  </button>
                </div>
              )}
            </div>

            {remainingAttempts < 3 && remainingAttempts > 0 && (
              <p className="text-sm text-yellow-600 mb-4">
                {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
              </p>
            )}
            
            <div className="text-center">
              <button
                onClick={() => window.location.href = '/login'}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <Icon name="information-circle" className="h-5 w-5 text-blue-400 mr-2" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Having trouble?</p>
                {showBackupCode ? (
                  <div>
                    <p>Enter one of your 8-character backup codes (e.g., A1B2C3D4)</p>
                    <p className="mt-1">Each backup code can only be used once.</p>
                  </div>
                ) : (
                  <div>
                    <p>Make sure your device's time is synchronized and try again.</p>
                    <p className="mt-1">Lost your authenticator? Use a backup code instead.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MfaVerification;