
import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../../App';
import { UserRole } from '../../types';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Loader from '../common/Loader';


interface CompanySettings {
    name: string;
    logo: string;
    primaryColor: string;
}

const Login: React.FC = () => {
    const auth = useContext(UserContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: 'Onboardly', logo: '', primaryColor: '#6366f1' });
    


    
    useEffect(() => {
        fetchCompanySettings();
    }, []);
    
    const fetchCompanySettings = async () => {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const data = await response.json();
                const company = data.company_info?.value || { name: 'Onboardly', logo: '', primaryColor: '#6366f1' };
                setCompanySettings(company);
            }
        } catch (error) {
            console.log('Could not fetch company settings, using defaults');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, rememberMe })
            });
            
            const data = await response.json();
            console.log('Login response:', { status: response.status, data });
            
            if (response.ok) {
                console.log('Login successful, user data:', data.user);
                // Force page reload to update context
                window.location.reload();
            } else {
                console.log('Login failed:', data.message);
                setError(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    




    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg mr-3">
                            <span className="text-white font-bold text-lg">MD</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            MyDigitalAccounts
                        </h1>
                    </div>
                    <p className="mt-2 text-gray-600">Welcome! Please sign in to continue.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input 
                                id="email-address" 
                                name="email" 
                                type="email" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                                placeholder="Email address" 
                            />
                        </div>
                        <div>
                            <input 
                                id="password" 
                                name="password" 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                                placeholder="Password" 
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex">
                                <Icon name="exclamation-triangle" className="h-5 w-5 text-red-400 mr-2" />
                                <div className="text-sm text-red-700">{error}</div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input 
                                id="remember-me" 
                                name="remember-me" 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" 
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <button 
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                Forgot your password?
                            </button>
                        </div>
                    </div>

                    <div>
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <Loader size="sm" color="white" />
                                    <span className="ml-2">Signing in...</span>
                                </div>
                            ) : 'Sign in'}
                        </Button>
                    </div>
                </form>
                 <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3">
                      <div>
                        <a href="#" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                          <Icon name="sso" className="w-5 h-5" />
                          <span className="ml-2">Single Sign-On (SSO)</span>
                        </a>
                      </div>
                    </div>
                </div>
            </div>
            
            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                        {resetMessage ? (
                            <div className="text-center">
                                <p className="text-green-600 mb-4">{resetMessage}</p>
                                <button 
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setResetMessage('');
                                        setResetEmail('');
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setError('');
                                try {
                                    console.log('Sending reset request for:', resetEmail);
                                    const response = await fetch('/api/forgot-password', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: resetEmail })
                                    });
                                    const data = await response.json();
                                    console.log('Reset response:', data);
                                    if (response.ok) {
                                        setResetMessage(data.message);
                                    } else {
                                        setError(data.message || 'Failed to send reset email');
                                    }
                                } catch (error) {
                                    console.error('Reset error:', error);
                                    setError('Network error. Please try again.');
                                }
                            }}>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
                                    required
                                />
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setShowForgotPassword(false)}
                                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                                    >
                                        Send Reset Link
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
