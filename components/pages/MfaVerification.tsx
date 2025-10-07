import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Loader from '../common/Loader';

interface MfaVerificationProps {
  sessionToken: string;
  userEmail: string;
  onSuccess: (userData: any) => void;
}

const MfaVerification: React.FC<MfaVerificationProps> = ({ sessionToken, userEmail, onSuccess }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [method, setMethod] = useState<'authenticator' | 'email' | 'backup'>('authenticator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendEmailOtp = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail, 
          sessionToken 
        })
      });
      
      if (response.ok) {
        setEmailOtpSent(true);
        setCountdown(60);
        setSuccess('OTP sent to your email');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to send email OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async () => {
    if (!verificationCode) {
      setError('Please enter verification code');
      return;
    }

    if (method === 'authenticator' && !/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (method === 'email' && !/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (method === 'backup' && !/^[A-F0-9]{8}$/.test(verificationCode.toUpperCase())) {
      setError('Please enter a valid backup code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          sessionToken,
          token: verificationCode,
          method,
          rememberDevice
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess('Verification successful!');
        onSuccess(data.user);
      } else {
        const error = await response.json();
        setError(error.message || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (newMethod: 'authenticator' | 'email' | 'backup') => {
    setMethod(newMethod);
    setVerificationCode('');
    setError('');
    
    if (newMethod === 'email' && !emailOtpSent) {
      sendEmailOtp();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="shield-check" className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your verification code to continue
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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

          {/* Method Selection */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleMethodChange('authenticator')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  method === 'authenticator'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Authenticator
              </button>
              <button
                onClick={() => handleMethodChange('email')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  method === 'email'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Email
              </button>
              <button
                onClick={() => handleMethodChange('backup')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  method === 'backup'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Backup
              </button>
            </div>
          </div>

          {/* Verification Input */}
          <div className="mb-6">
            {method === 'authenticator' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authenticator Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="000000"
                  className="w-full text-center text-xl font-mono tracking-widest px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  maxLength={6}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            {method === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="000000"
                  className="w-full text-center text-xl font-mono tracking-widest px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  maxLength={6}
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Check your email for the verification code
                  </p>
                  {countdown > 0 ? (
                    <span className="text-sm text-gray-500">Resend in {countdown}s</span>
                  ) : (
                    <button
                      onClick={sendEmailOtp}
                      disabled={loading}
                      className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            )}

            {method === 'backup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Backup Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-F0-9]/gi, '').toUpperCase().slice(0, 8);
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="XXXXXXXX"
                  className="w-full text-center text-xl font-mono tracking-widest px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  maxLength={8}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Enter one of your 8-character backup codes
                </p>
              </div>
            )}
          </div>

          {/* Remember Device */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Remember this device for 30 days
              </span>
            </label>
          </div>

          {/* Verify Button */}
          <Button
            onClick={verifyMfa}
            disabled={loading || !verificationCode}
            fullWidth
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader size="sm" color="white" />
                <span className="ml-2">Verifying...</span>
              </div>
            ) : (
              'Verify'
            )}
          </Button>

          {/* Help Text */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Having trouble? Contact your administrator for help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MfaVerification;