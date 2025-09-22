import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../App';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';

interface SettingsData {
  company_info: {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
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

  // Check admin access
  if (!auth?.user || auth.user.role !== 'Admin') {
    return (
      <div className="text-center py-16">
        <Icon name="shield-exclamation" className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">Administrator privileges required to access settings.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform API response to component state format
        const transformedSettings: SettingsData = {
          company_info: data.company_info?.value || { name: '', logo: '', primaryColor: '#6366f1', secondaryColor: '#f3f4f6', darkMode: false },
          working_hours: data.working_hours?.value || { startTime: '09:00', endTime: '17:00', timezone: 'UTC', workingDays: [] },
          password_policy: data.password_policy?.value || { minLength: 8, requireUppercase: true, requireNumbers: true, expiryDays: 90 },
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
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Organization Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Configure system-wide settings and policies.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {notification && (
        <div className={`p-4 rounded-md ${notification.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={settings.company_info.name}
                onChange={(e) => updateSetting('company_info', 'name', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
              <input
                type="url"
                value={settings.company_info.logo}
                onChange={(e) => updateSetting('company_info', 'logo', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                placeholder="https://example.com/logo.png"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <input
                type="color"
                value={settings.company_info.primaryColor}
                onChange={(e) => updateSetting('company_info', 'primaryColor', e.target.value)}
                className="w-full h-10 rounded-md border-gray-300"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
              <input
                type="color"
                value={settings.company_info.secondaryColor}
                onChange={(e) => updateSetting('company_info', 'secondaryColor', e.target.value)}
                className="w-full h-10 rounded-md border-gray-300"
              />
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
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Security Policies</h2>
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
            
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">SMS Notifications</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notification_preferences.sms.enabled}
                  onChange={(e) => updateSetting('notification_preferences', 'sms', { 
                    ...settings.notification_preferences.sms, 
                    enabled: e.target.checked 
                  })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable SMS notifications</span>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Policies Settings */}
      {activeTab === 'policies' && settings && (
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Working Hours & Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={settings.working_hours.timezone}
                onChange={(e) => updateSetting('working_hours', 'timezone', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
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
            
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/test-email', {
                      method: 'POST',
                      credentials: 'include'
                    });
                    const result = await response.json();
                    setNotification(result.success ? 
                      'Email configuration test successful!' : 
                      `Email test failed: ${result.message}`
                    );
                  } catch (error) {
                    setNotification('Email test failed: Network error');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Test Email Configuration
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Settings;