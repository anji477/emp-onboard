import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../App';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Loader from '../common/Loader';

interface MfaSetupData {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
  accountName?: string;
  issuer?: string;
  userEmail?: string;
}

interface MfaSetupProps {
  sessionToken?: string;
  userEmail?: string;
  userName?: string;
  onSuccess?: (userData: any) => void;
  isRequired?: boolean;
}

const MfaSetup: React.FC<MfaSetupProps> = ({ 
  sessionToken, 
  userEmail, 
  userName, 
  onSuccess, 
  isRequired = false 
}) => {
  const auth = useContext(UserContext);
  const [step, setStep] = useState(isRequired ? 0 : 1);
  const [selectedMethod, setSelectedMethod] = useState<'authenticator' | 'email'>('authenticator');
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [currentSessionToken, setCurrentSessionToken] = useState(sessionToken);
  const [csrfToken, setCsrfToken] = useState('');

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

  useEffect(() => {
    if (isRequired) {
      // Always setup authenticator for required MFA, regardless of session token
      setupAuthenticator();
    } else if (!isRequired) {
      setupAuthenticator();
    }
  }, [isRequired, sessionToken]);

  const validateSession = async () => {
    if (!currentSessionToken) {
      setSessionExpired(true);
      setError('No session token provided. Please restart the setup process.');
      return;
    }
    
    try {
      const response = await fetch('/api/mfa/validate-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ sessionToken: currentSessionToken })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.valid) {
        setSessionExpired(true);
        setError(data.message || 'Setup session has expired');
      } else {
        // Session is valid, proceed with setup
        setSessionExpired(false);
        setError('');
      }
    } catch (error) {
      setSessionExpired(true);
      setError('Failed to validate session. Please restart the setup process.');
    }
  };

  const restartSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update state with new session and QR code data
        setCurrentSessionToken(data.sessionToken);
        setSetupData({
          secret: data.secret,
          qrCode: data.qrCode,
          manualEntryKey: data.manualEntryKey,
          accountName: data.accountName,
          issuer: data.issuer,
          userEmail: data.userEmail
        });
        setSessionExpired(false);
        setError('');
        
        // Go directly to QR code step
        setStep(1);
        setSuccess('New QR code generated!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const error = await response.json();
        if (error.requiresLogin) {
          setError('Session cannot be restored. Please log in again.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        } else {
          setError(error.message || 'Failed to restart setup');
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupMethod = async (method: 'authenticator' | 'email') => {
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isRequired ? '/api/mfa/complete-setup' : '/api/mfa/setup-authenticator';
      const body = isRequired ? { sessionToken: currentSessionToken || undefined, method } : {};
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (method === 'authenticator') {
          setSetupData({
            secret: data.secret,
            qrCode: data.qrCode,
            manualEntryKey: data.manualEntryKey,
            accountName: data.accountName,
            issuer: data.issuer,
            userEmail: data.userEmail
          });
          // Update session token if provided
          if (data.sessionToken) {
            setCurrentSessionToken(data.sessionToken);
          }
          setStep(1);
        } else {
          setSuccess('Email OTP enabled successfully');
          setStep(3);
        }
      } else {
        const error = await response.json();
        if (error.expired) {
          setSessionExpired(true);
          setError(error.message);
          return;
        }
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          if (!isRequired) {
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
          return;
        }
        setError(error.message || 'Failed to setup MFA');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const setupAuthenticator = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSetupData({
          secret: data.secret,
          qrCode: data.qrCode,
          manualEntryKey: data.manualEntryKey,
          accountName: data.accountName,
          issuer: data.issuer,
          userEmail: data.userEmail
        });
        setCurrentSessionToken(data.sessionToken);
        setStep(1);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to setup MFA');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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
      const body = { 
        token: verificationCode,
        sessionToken: currentSessionToken || undefined
      };
        
      const response = await fetch('/api/mfa/verify-setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setSuccess('MFA setup completed successfully!');
        setStep(3);
        
        if (data.loginComplete && onSuccess) {
          setTimeout(() => {
            onSuccess(data.user);
          }, 2000);
        }
      } else {
        const error = await response.json();
        if (error.expired) {
          setSessionExpired(true);
          setError(error.message);
          return;
        }
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          if (!isRequired) {
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
          return;
        }
        setError(error.message || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (onSuccess) {
      onSuccess(null);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading && !setupData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Setting up MFA...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="shield-check" className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Set Up Multi-Factor Authentication
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Secure your account with an additional layer of protection
          </p>
          {isRequired && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <Icon name="information-circle" className="h-4 w-4 inline mr-1" />
                MFA is required for your account role
              </p>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        {!isRequired && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step > stepNum ? (
                      <Icon name="check" className="h-4 w-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  {stepNum < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step > stepNum ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Scan QR</span>
              <span>Verify</span>
              <span>Backup Codes</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <Icon name="exclamation-triangle" className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-sm text-red-700">
                {error}
                {sessionExpired && (
                  <div className="mt-2">
                    <Button
                      onClick={restartSetup}
                      disabled={loading}
                      size="sm"
                      variant="secondary"
                    >
                      {loading ? <Loader size="sm" /> : 'Generate New QR Code'}
                    </Button>
                  </div>
                )}
              </div>
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

        {/* Step 0: Method Selection (Required MFA only) */}
        {step === 0 && !sessionExpired && (
          <Card>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-4">Choose MFA Method</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {isRequired ? 'MFA is required for your account role. ' : ''}Choose how you'd like to secure your account:
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setSelectedMethod('authenticator');
                    setupMethod('authenticator');
                  }}
                  disabled={loading}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 focus:border-indigo-500 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <Icon name="device-phone-mobile" className="h-8 w-8 text-indigo-600 mr-4" />
                    <div>
                      <h3 className="font-medium text-gray-900">Authenticator App</h3>
                      <p className="text-sm text-gray-500">Use Google Authenticator, Authy, or similar apps</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedMethod('email');
                    setupMethod('email');
                  }}
                  disabled={loading}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 focus:border-indigo-500 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <Icon name="envelope" className="h-8 w-8 text-indigo-600 mr-4" />
                    <div>
                      <h3 className="font-medium text-gray-900">Email OTP</h3>
                      <p className="text-sm text-gray-500">Receive codes via email to {userEmail}</p>
                    </div>
                  </div>
                </button>
              </div>
              
              {loading && (
                <div className="mt-6 flex items-center justify-center">
                  <Loader size="sm" />
                  <span className="ml-2 text-sm text-gray-600">Setting up...</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 1: QR Code */}
        {step === 1 && setupData && !sessionExpired && (
          <Card>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-4">Set Up Authenticator</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Scan the QR code or enter the details manually in your authenticator app
              </p>
              
              {/* QR Code Section */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Option 1: Scan QR Code</h3>
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  {setupData.qrCode ? (
                    <img 
                      src={setupData.qrCode} 
                      alt="MFA QR Code" 
                      className="w-48 h-48"
                    />
                  ) : (
                    <QRCodeSVG 
                      value={setupData.qrCodeUrl || `otpauth://totp/${encodeURIComponent(setupData.accountName || `${setupData.issuer || 'MyApp'} (${setupData.userEmail || userEmail})`)}?secret=${setupData.manualEntryKey}&issuer=${encodeURIComponent(setupData.issuer || 'MyApp')}`}
                      size={200} 
                    />
                  )}
                </div>
              </div>
              
              {/* Manual Entry Section */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Option 2: Manual Entry</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Account Name:</label>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded flex-1 mr-2">
                        {setupData.accountName || `${setupData.issuer || 'MyApp'} (${setupData.userEmail || userEmail})`}
                      </code>
                      <button
                        onClick={() => copyToClipboard(setupData.accountName || `${setupData.issuer || 'MyApp'} (${setupData.userEmail || userEmail})`)}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Copy account name"
                      >
                        <Icon name="clipboard" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Secret Key:</label>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded flex-1 mr-2 break-all">
                        {setupData.manualEntryKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(setupData.manualEntryKey)}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Copy secret key"
                      >
                        <Icon name="clipboard" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recommended Apps */}
              <div className="text-left mb-6">
                <h3 className="font-medium mb-2">Recommended Apps:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Google Authenticator</li>
                  <li>• Microsoft Authenticator</li>
                  <li>• Authy</li>
                  <li>• 1Password</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => setStep(2)} 
                fullWidth 
                className="mt-4"
                disabled={sessionExpired}
              >
                I've Added the Account
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Verification */}
        {step === 2 && !sessionExpired && (
          <Card>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-4">Verify Setup</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter the 6-digit code from your authenticator app
              </p>
              
              <div className="mb-6">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  maxLength={6}
                />
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="secondary" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={verifySetup}
                  disabled={loading || verificationCode.length !== 6 || sessionExpired}
                  className="flex-1"
                >
                  {loading ? <Loader size="sm" color="white" /> : 'Verify'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Backup Codes */}
        {step === 3 && !sessionExpired && (
          <Card>
            <div className="text-center">
              <Icon name="key" className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-4">Save Your Backup Codes</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Store these codes in a safe place. Each code can only be used once.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-white dark:bg-gray-700 p-2 rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3 mb-6">
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  className="flex-1"
                >
                  <Icon name="clipboard" className="h-4 w-4 mr-2" />
                  Copy Codes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const element = document.createElement('a');
                    const file = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
                    element.href = URL.createObjectURL(file);
                    element.download = 'mfa-backup-codes.txt';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                  className="flex-1"
                >
                  <Icon name="arrow-down-tray" className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <Icon name="exclamation-triangle" className="h-5 w-5 text-yellow-400 mr-2" />
                  <div className="text-sm text-yellow-700">
                    <strong>Important:</strong> Save these codes now. You won't be able to see them again.
                  </div>
                </div>
              </div>
              
              <Button onClick={handleComplete} fullWidth>
                Complete Setup
              </Button>
            </div>
          </Card>
        )}

        {/* Session Expired State */}
        {sessionExpired && (
          <Card>
            <div className="text-center">
              <Icon name="clock" className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-4 text-red-600">
                Setup Session Expired
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Your MFA setup session has expired for security reasons. Click the button below to generate a new QR code and continue setup.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <Icon name="information-circle" className="h-5 w-5 text-yellow-400 mr-2" />
                  <div className="text-sm text-yellow-700">
                    <strong>Security Note:</strong> Setup sessions expire after 30 minutes. A new QR code will be generated.
                  </div>
                </div>
              </div>
              
              <Button
                onClick={restartSetup}
                disabled={loading}
                fullWidth
                className="mb-4"
              >
                {loading ? <Loader size="sm" color="white" /> : 'Generate New QR Code'}
              </Button>
              
              {!isRequired && (
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = '/dashboard'}
                  fullWidth
                >
                  Return to Dashboard
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MfaSetup;