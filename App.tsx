
import React, { useState, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/pages/Dashboard';
import Tasks from './components/pages/Tasks';
import Documents from './components/pages/Documents';
import Training from './components/pages/Training';
import Team from './components/pages/Team';
import Assets from './components/pages/Assets';
import Policies from './components/pages/Policies';
import Feedback from './components/pages/Feedback';
import Profile from './components/pages/Profile';
import AdminDashboard from './components/pages/AdminDashboard';
import UserManagement from './components/pages/UserManagement';
import Settings from './components/pages/Settings';
import AssignmentManager from './components/pages/AssignmentManager';
import Login from './components/pages/Login';
import SetupPassword from './components/pages/SetupPassword';
import ResetPassword from './components/pages/ResetPassword';
import MaintenancePage from './components/MaintenancePage';
import { User, UserRole } from './types';
import { mockUser, mockAdmin } from './data/mockData';
import { ThemeProvider } from './contexts/ThemeContext';

export const UserContext = React.createContext<{ user: User | null; login: (role: UserRole) => void; logout: () => void; updateUser: (userData: Partial<User>) => void; } | null>(null);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean; message: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback((role: UserRole) => {
    const userData = role === UserRole.Admin ? mockAdmin : mockUser;
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  }, []);
  
  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }



  return (
    <ThemeProvider>
      <UserContext.Provider value={{ user, login, logout, updateUser }}>

        <HashRouter>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/setup-password" element={<SetupPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="documents" element={<Documents />} />
                <Route path="training" element={<Training />} />
                <Route path="team" element={<Team />} />
                <Route path="assets" element={<Assets />} />
                <Route path="policies" element={<Policies />} />
                <Route path="feedback" element={<Feedback />} />
                <Route path="profile" element={<Profile />} />
                {user.role === UserRole.Admin && <Route path="admin" element={<AdminDashboard />} />}
                {user.role === UserRole.Admin && <Route path="users" element={<UserManagement />} />}
                {user.role === UserRole.Admin && <Route path="settings" element={<Settings />} />}
                {(user.role === UserRole.Admin || user.role === 'HR') && <Route path="assignments" element={<AssignmentManager />} />}
              </Route>
              <Route path="/login" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
        </HashRouter>
      </UserContext.Provider>
    </ThemeProvider>
  );
};

export default App;
