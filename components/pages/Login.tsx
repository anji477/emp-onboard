
import React, { useContext, useState } from 'react';
import { UserContext } from '../../App';
import { UserRole } from '../../types';
import Button from '../common/Button';
import Icon from '../common/Icon';

const Login: React.FC = () => {
    const auth = useContext(UserContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log('Login response:', { status: response.status, data });
            
            if (response.ok) {
                console.log('Login successful, user data:', data.user);
                // Update context (cookie is set automatically)
                if (auth?.updateUser) {
                    auth.updateUser(data.user);
                }
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
                    <h1 className="text-4xl font-bold text-indigo-600">Onboardly</h1>
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
                            <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign in'}
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
        </div>
    );
};

export default Login;
