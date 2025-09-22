
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './common/Icon';
import { UserContext } from '../App';
import { UserRole } from '../types';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const auth = useContext(UserContext);
  const isAdmin = auth?.user?.role === UserRole.Admin;
  const isHR = auth?.user?.role === 'HR';

  const navItems = [
    { to: '/', icon: 'home', label: 'Dashboard' },
    { to: '/tasks', icon: 'check-circle', label: 'Tasks' },
    { to: '/documents', icon: 'document-text', label: 'Documents' },
    { to: '/training', icon: 'academic-cap', label: 'Training' },
    { to: '/team', icon: 'users', label: 'Team & Directory' },
    { to: '/assets', icon: 'computer-desktop', label: 'IT Assets' },
    { to: '/policies', icon: 'shield-check', label: 'Policies' },
    { to: '/feedback', icon: 'chat-bubble-left-right', label: 'Feedback' },
    { to: '/profile', icon: 'user-circle', label: 'Profile' },
  ];

  if (isAdmin || isHR) {
    navItems.push({ to: '/assignments', icon: 'clipboard-document-list', label: 'Assignments' });
  }

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: 'cog-6-tooth', label: 'Admin Dashboard' });
    navItems.push({ to: '/users', icon: 'user-plus', label: 'User Management' });
    navItems.push({ to: '/settings', icon: 'cog-8-tooth', label: 'Settings' });
  }

  const linkClasses = "flex items-center px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-700 hover:text-indigo-700 dark:hover:text-indigo-400 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-500 dark:hover:bg-indigo-600 hover:text-white";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <aside
        className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 w-64 transform transition-all duration-300 ease-in-out z-30 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Onboardly</h1>
        </div>
        <nav className="mt-6 px-4">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon name={item.icon} className="h-6 w-6 mr-3" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
