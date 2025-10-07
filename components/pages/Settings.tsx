import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../App';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';
import FileInput from '../common/FileInput';
import { getCurrentTimeInTimezone, detectUserTimezone, formatWorkingHours, isWithinWorkingHours } from '../../utils/timezoneUtils';

interface SettingsData {
  company_info: {
    name: string;
    description: string;
    industry: string;
    size: string;
    website: string;
    phone: string;
    address: string;
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    darkMode: boolean;
  };
  working_hours: {
    startTime: string;
    endTime: string;
    timezone: string;
    workingDays: string[];
  };
  password_policy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    expiryDays: number;
  };

  notification_preferences: {
    email: {
      enabled: boolean;
      onboarding: boolean;
      taskReminders: boolean;
    };
    sms: {
      enabled: boolean;
    };
  };
  backup_settings: {
    autoBackup: boolean;
    frequency: string;
    retentionDays: number;
    location: string;
    encryption: boolean;
  };
  maintenance_mode: {
    enabled: boolean;
    message: string;
    allowedRoles: string[];
  };
  integration_settings: {
    sso: {
      enabled: boolean;
      provider: string;
      domain: string;
    };
    slack: {
      enabled: boolean;
      webhook: string;
    };
    teams: {
      enabled: boolean;
      webhook: string;
    };
  };
  email_settings: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    from_email: string;
    from_name: string;
  };
}

const Settings: React.FC = () => {
  const auth = useContext(UserContext);
  const { darkMode, setDarkMode } = useTheme();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState('');
  const [activeTab, setActiveTab] = useState('company');
  const [testEmail, setTestEmail] = useState('');

  // Check admin access
  if (!auth?.user || auth.user.role !== 'Admin') {
    return (
      <div className="text-center py-16">
        <Icon name="shield-exclamation" className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">Administrator privileges required to access settings.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  // Apply favicon when settings change
  useEffect(() => {
    if (settings?.company_info?.favicon) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = settings.company_info.favicon;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [settings?.company_info?.favicon]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform API response to component state format
        const transformedSettings: SettingsData = {
          company_info: data.company_info?.value || { name: '', description: '', industry: '', size: '', website: '', phone: '', address: '', logo: '', favicon: '', primaryColor: '#6366f1', secondaryColor: '#f3f4f6', accentColor: '#10b981', backgroundColor: '#ffffff', textColor: '#1f2937', darkMode: false },
          working_hours: data.working_hours?.value || { startTime: '09:00', endTime: '17:00', timezone: 'UTC', workingDays: [] },
          password_policy: data.password_policy?.value || { minLength: 8, requireUppercase: true, requireNumbers: true, requireSymbols: true, expiryDays: 90 },

          notification_preferences: data.notification_preferences?.value || { email: { enabled: true, onboarding: true, taskReminders: true }, sms: { enabled: false } },
          backup_settings: data.backup_settings?.value || { autoBackup: true, frequency: 'daily', retentionDays: 30, location: 'cloud', encryption: true },
          maintenance_mode: data.maintenance_mode?.value || { enabled: false, message: 'System under maintenance', allowedRoles: ['Admin'] },
          integration_settings: data.integration_settings?.value || { sso: { enabled: false, provider: 'none', domain: '' }, slack: { enabled: false, webhook: '' }, teams: { enabled: false, webhook: '' } },
          email_settings: data.email_settings?.value || { smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: 'Onboardly' }
        };
        setSettings(transformedSettings);
        // Sync dark mode with settings
        if (transformedSettings.company_info.darkMode !== darkMode) {
          setDarkMode(transformedSettings.company_info.darkMode);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setNotification('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const csrfData = await csrfResponse.json();
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ settings })
      });

      if (response.ok) {
        setNotification('Settings saved successfully!');
        setTimeout(() => setNotification(''), 3000);
      } else {
        setNotification('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotification('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: keyof SettingsData, field: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [field]: value
      }
    }));
    
    // If updating dark mode, apply immediately
    if (category === 'company_info' && field === 'darkMode') {
      setDarkMode(value);
    }
  };
  


  const tabs = [
    { id: 'company', label: 'Company', icon: 'building-office' },
    { id: 'security', label: 'Security', icon: 'shield-check' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'policies', label: 'Policies', icon: 'document-text' },
    { id: 'system', label: 'System', icon: 'server' },
    { id: 'integrations', label: 'Integrations', icon: 'puzzle-piece' },
    { id: 'email', label: 'Email', icon: 'envelope' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">Manage your organization settings and preferences</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Icon name="check" className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-md ${
          notification.includes('success') || notification.includes('saved') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon name={tab.icon} className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Company Settings */}
      {activeTab === 'company' && settings && (
        <Card>
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
              <input
                type="text"
                value={settings.company_info.name}
                onChange={(e) => updateSetting('company_info', 'name', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Industry</label>
              <select
                value={settings.company_info.industry}
                onChange={(e) => updateSetting('company_info', 'industry', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              >
                <option value="">Select Industry</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Retail">Retail</option>
                <option value="Consulting">Consulting</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={settings.company_info.description}
                onChange={(e) => updateSetting('company_info', 'description', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                rows={3}
                placeholder="Brief description of your company"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Size</label>
              <select
                value={settings.company_info.size}
                onChange={(e) => updateSetting('company_info', 'size', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              >
                <option value="">Select Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website</label>
              <input
                type="url"
                value={settings.company_info.website}
                onChange={(e) => updateSetting('company_info', 'website', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                placeholder="https://company.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                value={settings.company_info.phone}
                onChange={(e) => updateSetting('company_info', 'phone', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
              <input
                type="text"
                value={settings.company_info.address}
                onChange={(e) => updateSetting('company_info', 'address', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo Upload</label>
              <FileInput
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                placeholder="Upload company logo"
                maxSize={5}
                showPreview={true}
                currentFile={settings.company_info.logo}
                previewAlt="Logo"
                onChange={(files) => {
                  const file = files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      updateSetting('company_info', 'logo', event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPEG, JPG, SVG (max 5MB)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Favicon Upload</label>
              <FileInput
                accept="image/x-icon,image/png,image/svg+xml"
                placeholder="Upload favicon"
                maxSize={1}
                showPreview={true}
                currentFile={settings.company_info.favicon}
                previewAlt="Favicon"
                onChange={(files) => {
                  const file = files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const faviconData = event.target?.result as string;
                      updateSetting('company_info', 'favicon', faviconData);
                      // Update favicon in browser
                      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
                      link.type = 'image/x-icon';
                      link.rel = 'shortcut icon';
                      link.href = faviconData;
                      document.getElementsByTagName('head')[0].appendChild(link);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ICO, PNG, SVG (max 1MB, recommended 32x32px)</p>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">Brand Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Primary</label>
                  <input
                    type="color"
                    value={settings.company_info.primaryColor}
                    onChange={(e) => updateSetting('company_info', 'primaryColor', e.target.value)}
                    className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary</label>
                  <input
                    type="color"
                    value={settings.company_info.secondaryColor}
                    onChange={(e) => updateSetting('company_info', 'secondaryColor', e.target.value)}
                    className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Accent</label>
                  <input
                    type="color"
                    value={settings.company_info.accentColor}
                    onChange={(e) => updateSetting('company_info', 'accentColor', e.target.value)}
                    className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Background</label>
                  <input
                    type="color"
                    value={settings.company_info.backgroundColor}
                    onChange={(e) => updateSetting('company_info', 'backgroundColor', e.target.value)}
                    className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Text</label>
                  <input
                    type="color"
                    value={settings.company_info.textColor}
                    onChange={(e) => updateSetting('company_info', 'textColor', e.target.value)}
                    className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable dark theme across the application</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.company_info.darkMode}
                    onChange={(e) => updateSetting('company_info', 'darkMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && settings && (
        <Card>
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Security Policies</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Password Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={settings.password_policy.minLength}
                    onChange={(e) => updateSetting('password_policy', 'minLength', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={settings.password_policy.expiryDays}
                    onChange={(e) => updateSetting('password_policy', 'expiryDays', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  />
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.password_policy.requireUppercase}
                    onChange={(e) => updateSetting('password_policy', 'requireUppercase', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require uppercase letters</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.password_policy.requireNumbers}
                    onChange={(e) => updateSetting('password_policy', 'requireNumbers', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require numbers</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.password_policy.requireSymbols}
                    onChange={(e) => updateSetting('password_policy', 'requireSymbols', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require special characters (!@#$%^&*)</span>
                </label>
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && settings && (
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Notification Preferences</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Email Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notification_preferences.email.enabled}
                    onChange={(e) => updateSetting('notification_preferences', 'email', { 
                      ...settings.notification_preferences.email, 
                      enabled: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable email notifications</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notification_preferences.email.onboarding}
                    onChange={(e) => updateSetting('notification_preferences', 'email', { 
                      ...settings.notification_preferences.email, 
                      onboarding: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Onboarding notifications</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notification_preferences.email.taskReminders}
                    onChange={(e) => updateSetting('notification_preferences', 'email', { 
                      ...settings.notification_preferences.email, 
                      taskReminders: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Task reminders</span>
                </label>
              </div>
            </div>
            
            {/* SMS Notifications section removed */}
          </div>
        </Card>
      )}

      {/* Policies Settings */}
      {activeTab === 'policies' && settings && (
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Working Hours & Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                value={settings.working_hours.startTime}
                onChange={(e) => updateSetting('working_hours', 'startTime', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input
                type="time"
                value={settings.working_hours.endTime}
                onChange={(e) => updateSetting('working_hours', 'endTime', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Timezone
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    Current: {getCurrentTimeInTimezone(settings.working_hours.timezone)}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const detectedTimezone = detectUserTimezone();
                    updateSetting('working_hours', 'timezone', detectedTimezone);
                    setNotification(`Timezone auto-detected: ${detectedTimezone}`);
                    setTimeout(() => setNotification(''), 3000);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                >
                  Auto-detect
                </button>
              </div>
              <select
                value={settings.working_hours.timezone}
                onChange={(e) => updateSetting('working_hours', 'timezone', e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
                size={1}
              >
                <optgroup label="UTC">
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </optgroup>
                
                <optgroup label="North America">
                  <option value="America/New_York">Eastern Time (New York)</option>
                  <option value="America/Chicago">Central Time (Chicago)</option>
                  <option value="America/Denver">Mountain Time (Denver)</option>
                  <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
                  <option value="America/Phoenix">Arizona Time (Phoenix)</option>
                  <option value="America/Anchorage">Alaska Time (Anchorage)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (Honolulu)</option>
                  <option value="America/Toronto">Eastern Time (Toronto)</option>
                  <option value="America/Vancouver">Pacific Time (Vancouver)</option>
                </optgroup>
                
                <optgroup label="UK & Europe">
                  <option value="Europe/London">GMT (London)</option>
                  <option value="Europe/Edinburgh">GMT (Edinburgh)</option>
                  <option value="Europe/Dublin">GMT (Dublin)</option>
                  <option value="Europe/Belfast">GMT (Belfast)</option>
                  <option value="Europe/Paris">CET (Paris)</option>
                  <option value="Europe/Berlin">CET (Berlin)</option>
                  <option value="Europe/Rome">CET (Rome)</option>
                  <option value="Europe/Madrid">CET (Madrid)</option>
                  <option value="Europe/Amsterdam">CET (Amsterdam)</option>
                  <option value="Europe/Stockholm">CET (Stockholm)</option>
                  <option value="Europe/Moscow">MSK (Moscow)</option>
                  <option value="Europe/Istanbul">TRT (Istanbul)</option>
                </optgroup>
                
                <optgroup label="Asia Pacific">
                  <option value="Asia/Tokyo">JST (Tokyo)</option>
                  <option value="Asia/Shanghai">CST (Shanghai)</option>
                  <option value="Asia/Hong_Kong">HKT (Hong Kong)</option>
                  <option value="Asia/Singapore">SGT (Singapore)</option>
                  <option value="Asia/Seoul">KST (Seoul)</option>
                  <option value="Asia/Kolkata">IST (Mumbai)</option>
                  <option value="Asia/Delhi">IST (Delhi)</option>
                  <option value="Asia/Bangalore">IST (Bangalore)</option>
                  <option value="Asia/Dubai">GST (Dubai)</option>
                  <option value="Asia/Bangkok">ICT (Bangkok)</option>
                  <option value="Asia/Jakarta">WIB (Jakarta)</option>
                  <option value="Asia/Manila">PHT (Manila)</option>
                  <option value="Asia/Kuala_Lumpur">MYT (Kuala Lumpur)</option>
                  <option value="Asia/Taipei">CST (Taipei)</option>
                  <option value="Australia/Sydney">AEDT (Sydney)</option>
                  <option value="Australia/Melbourne">AEDT (Melbourne)</option>
                  <option value="Australia/Brisbane">AEST (Brisbane)</option>
                  <option value="Australia/Perth">AWST (Perth)</option>
                  <option value="Pacific/Auckland">NZDT (Auckland)</option>
                  <option value="Pacific/Fiji">FJT (Fiji)</option>
                </optgroup>
                
                <optgroup label="South America">
                  <option value="America/Sao_Paulo">BRT (São Paulo)</option>
                  <option value="America/Argentina/Buenos_Aires">ART (Buenos Aires)</option>
                  <option value="America/Lima">PET (Lima)</option>
                  <option value="America/Bogota">COT (Bogotá)</option>
                </optgroup>
                
                <optgroup label="Africa & Middle East">
                  <option value="Africa/Cairo">EET (Cairo)</option>
                  <option value="Africa/Johannesburg">SAST (Johannesburg)</option>
                  <option value="Africa/Lagos">WAT (Lagos)</option>
                  <option value="Asia/Riyadh">AST (Riyadh)</option>
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This timezone will be used for all date/time displays and working hours calculations
              </p>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Working Days</label>
              <div className="grid grid-cols-7 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const isSelected = settings.working_hours.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const workingDays = settings.working_hours.workingDays;
                        if (isSelected) {
                          updateSetting('working_hours', 'workingDays', workingDays.filter(d => d !== day));
                        } else {
                          updateSetting('working_hours', 'workingDays', [...workingDays, day]);
                        }
                      }}
                      className={`p-2 text-xs font-medium rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Select the days when your organization operates
              </p>
            </div>
            
            <div className="md:col-span-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <Icon name="information-circle" className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">Working Hours Preview:</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      {formatWorkingHours(
                        settings.working_hours.startTime,
                        settings.working_hours.endTime,
                        settings.working_hours.timezone,
                        settings.working_hours.workingDays
                      )}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      Status: {isWithinWorkingHours(
                        settings.working_hours.startTime,
                        settings.working_hours.endTime,
                        settings.working_hours.timezone,
                        settings.working_hours.workingDays
                      ) ? 'Currently in working hours' : 'Outside working hours'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* System Settings */}
      {activeTab === 'system' && settings && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Backup & Maintenance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Auto Backup</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically backup system data</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.backup_settings.autoBackup}
                    onChange={(e) => updateSetting('backup_settings', 'autoBackup', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                  <select
                    value={settings.backup_settings.frequency}
                    onChange={(e) => updateSetting('backup_settings', 'frequency', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retention Days</label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={settings.backup_settings.retentionDays}
                    onChange={(e) => updateSetting('backup_settings', 'retentionDays', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Maintenance Mode</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Enable Maintenance Mode</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Restrict access during system maintenance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode.enabled}
                    onChange={(e) => updateSetting('maintenance_mode', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Message</label>
                <textarea
                  value={settings.maintenance_mode.message}
                  onChange={(e) => updateSetting('maintenance_mode', 'message', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  rows={3}
                  placeholder="Message to display during maintenance"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Integrations Settings */}
      {activeTab === 'integrations' && settings && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Single Sign-On (SSO)</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Enable SSO</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allow users to login with external identity provider</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.integration_settings.sso.enabled}
                    onChange={(e) => updateSetting('integration_settings', 'sso', { ...settings.integration_settings.sso, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SSO Provider</label>
                  <select
                    value={settings.integration_settings.sso.provider}
                    onChange={(e) => updateSetting('integration_settings', 'sso', { ...settings.integration_settings.sso, provider: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  >
                    <option value="none">None</option>
                    <option value="google">Google</option>
                    <option value="microsoft">Microsoft</option>
                    <option value="okta">Okta</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                  <input
                    type="text"
                    value={settings.integration_settings.sso.domain}
                    onChange={(e) => updateSetting('integration_settings', 'sso', { ...settings.integration_settings.sso, domain: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                    placeholder="company.com"
                  />
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Team Communication</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Slack Integration</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.integration_settings.slack.enabled}
                      onChange={(e) => updateSetting('integration_settings', 'slack', { ...settings.integration_settings.slack, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Slack notifications</span>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={settings.integration_settings.slack.webhook}
                      onChange={(e) => updateSetting('integration_settings', 'slack', { ...settings.integration_settings.slack, webhook: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Microsoft Teams Integration</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.integration_settings.teams.enabled}
                      onChange={(e) => updateSetting('integration_settings', 'teams', { ...settings.integration_settings.teams, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Teams notifications</span>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={settings.integration_settings.teams.webhook}
                      onChange={(e) => updateSetting('integration_settings', 'teams', { ...settings.integration_settings.teams, webhook: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                      placeholder="https://outlook.office.com/webhook/..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && settings && (
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Email Configuration</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={settings.email_settings.smtp_host}
                  onChange={(e) => updateSetting('email_settings', 'smtp_host', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  placeholder="smtp.gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                <input
                  type="number"
                  value={settings.email_settings.smtp_port}
                  onChange={(e) => updateSetting('email_settings', 'smtp_port', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  placeholder="587"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
                <input
                  type="text"
                  value={settings.email_settings.smtp_user}
                  onChange={(e) => updateSetting('email_settings', 'smtp_user', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  placeholder="your-email@gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
                <input
                  type="password"
                  value={settings.email_settings.smtp_password}
                  onChange={(e) => updateSetting('email_settings', 'smtp_password', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  placeholder="App password or SMTP password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                <input
                  type="email"
                  value={settings.email_settings.from_email}
                  onChange={(e) => updateSetting('email_settings', 'from_email', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  placeholder="noreply@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                <input
                  type="text"
                  value={settings.email_settings.from_name}
                  onChange={(e) => updateSetting('email_settings', 'from_name', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  placeholder="Onboardly"
                />
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Test Email Configuration</h3>

              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Test Email Address
                    <span className="text-gray-500 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800"
                    placeholder="user@example.com"
                  />
                </div>
                
                <div>
                  <button
                    onClick={async () => {
                      try {
                        // Get CSRF token
                        const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
                        const csrfData = await csrfResponse.json();
                        
                        const response = await fetch('/api/test-email', {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfData.csrfToken
                          },
                          credentials: 'include',
                          body: JSON.stringify({ testEmail })
                        });
                        const result = await response.json();
                        const message = result.success ? 
                          result.message : 
                          `Email test failed: ${result.message}`;
                        setNotification(message);
                        if (result.success) {
                          setTimeout(() => setNotification(''), 3000);
                        }
                      } catch (error) {
                        setNotification('Email test failed: Network error');
                      }
                    }}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <Icon name={testEmail ? 'paper-airplane' : 'wifi'} className="w-4 h-4 mr-2" />
                      {testEmail ? 'Send Test Email' : 'Test Connection'}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Settings;