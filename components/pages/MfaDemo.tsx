import React, { useState } from 'react';
import MfaSetup from './MfaSetup';
import MfaVerification from './MfaVerification';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';

const MfaDemo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'demo' | 'setup' | 'verify'>('demo');
  const [demoUser] = useState({
    email: 'demo@example.com',
    name: 'Demo User'
  });

  const handleSetupSuccess = (userData: any) => {
    console.log('MFA Setup completed:', userData);
    setCurrentStep('verify');
  };

  const handleVerificationSuccess = (userData: any) => {
    console.log('MFA Verification successful:', userData);
    alert('MFA flow completed successfully!');
    setCurrentStep('demo');
  };

  const handleSetupRequired = () => {
    setCurrentStep('setup');
  };

  if (currentStep === 'setup') {
    return (
      <MfaSetup
        userEmail={demoUser.email}
        userName={demoUser.name}
        onSuccess={handleSetupSuccess}
        isRequired={true}
      />
    );
  }

  if (currentStep === 'verify') {
    return (
      <MfaVerification
        userEmail={demoUser.email}
        onSuccess={handleVerificationSuccess}
        onSetupRequired={handleSetupRequired}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="shield-check" className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MFA Implementation Demo
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Test the Multi-Factor Authentication setup and verification flow
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <div className="text-center p-6">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Icon name="qr-code" className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">MFA Setup</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Experience the complete MFA setup flow with QR code generation and verification
              </p>
              <Button 
                onClick={() => setCurrentStep('setup')}
                fullWidth
              >
                Start MFA Setup
              </Button>
            </div>
          </Card>

          <Card>
            <div className="text-center p-6">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Icon name="key" className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">MFA Verification</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Test the login verification process with your authenticator app
              </p>
              <Button 
                onClick={() => setCurrentStep('verify')}
                variant="secondary"
                fullWidth
              >
                Test Verification
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Icon name="information-circle" className="h-5 w-5 text-blue-500 mr-2" />
                Implementation Features
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Security Features</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Server-side QR code generation</li>
                    <li>• CSRF token protection</li>
                    <li>• Session-based setup flow</li>
                    <li>• Backup codes generation</li>
                    <li>• Time-based token validation</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">User Experience</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Progressive setup wizard</li>
                    <li>• QR code + manual entry options</li>
                    <li>• Real-time validation</li>
                    <li>• Error handling & recovery</li>
                    <li>• Mobile-friendly interface</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Demo user: <span className="font-mono">{demoUser.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MfaDemo;