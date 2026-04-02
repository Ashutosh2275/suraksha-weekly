'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { motion } from 'framer-motion';

interface SystemConfig {
  systemName: string;
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  apiUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConnections: number;
  requestTimeout: number;
  enableCaching: boolean;
  cacheTtl: number;
  enableMetrics: boolean;
  metricsInterval: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  backupSchedule: 'daily' | 'weekly' | 'monthly';
  autoBackupEnabled: boolean;
  auditRetentionDays: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  slackIntegration: boolean;
  slackChannel: string;
  criticalAlerts: boolean;
  warningAlerts: boolean;
  infoLogs: boolean;
  alertThreshold: 'critical' | 'high' | 'medium' | 'low';
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  maxLoginAttempts: number;
  ipWhitelist: string[];
  corsOrigins: string[];
  enableRateLimit: boolean;
  rateLimitRequests: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'system' | 'notifications' | 'security'>('system');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    systemName: 'Suraksha Admin Portal',
    environment: 'STAGING',
    apiUrl: 'https://api.staging.suraksha.io',
    logLevel: 'info',
    maxConnections: 1000,
    requestTimeout: 30,
    enableCaching: true,
    cacheTtl: 3600,
    enableMetrics: true,
    metricsInterval: 60,
    maintenanceMode: false,
    maintenanceMessage: 'System under maintenance. Please try again later.',
    backupSchedule: 'daily',
    autoBackupEnabled: true,
    auditRetentionDays: 90,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    slackIntegration: true,
    slackChannel: '#suraksha-alerts',
    criticalAlerts: true,
    warningAlerts: true,
    infoLogs: false,
    alertThreshold: 'critical',
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: true,
    sessionTimeout: 3600,
    passwordMinLength: 12,
    passwordRequireSpecial: true,
    maxLoginAttempts: 5,
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
    corsOrigins: ['https://staging.suraksha.io', 'https://app.suraksha.io'],
    enableRateLimit: true,
    rateLimitRequests: 1000,
  });

  const handleSystemConfigChange = (key: keyof SystemConfig, value: any) => {
    setSystemConfig(prev => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: any) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSecurityChange = (key: keyof SecuritySettings, value: any) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const tabs = [
    { id: 'system' as const, label: 'System Configuration', icon: '⚙️' },
    { id: 'notifications' as const, label: 'Notifications', icon: '🔔' },
    { id: 'security' as const, label: 'Security', icon: '🔐' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-display font-bold text-text-primary">
          System Settings
        </h1>
        <p className="text-text-secondary mt-2">
          Manage system configuration, notifications, and security policies
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-2 font-medium text-sm transition-colors relative ${
              activeTab === tab.id
                ? 'text-brand-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"
                initial={false}
              />
            )}
          </button>
        ))}
      </div>

      {/* System Configuration Tab */}
      {activeTab === 'system' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* General Settings */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>General Configuration</CardTitle>
              <CardDescription>Core system settings and environment configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="System Name"
                value={systemConfig.systemName}
                onChange={e => handleSystemConfigChange('systemName', e.target.value)}
                placeholder="Enter system name"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Environment"
                  value={systemConfig.environment}
                  onChange={value => handleSystemConfigChange('environment', value as any)}
                  options={[
                    { value: 'DEVELOPMENT', label: 'Development' },
                    { value: 'STAGING', label: 'Staging' },
                    { value: 'PRODUCTION', label: 'Production' },
                  ]}
                />

                <Select
                  label="Log Level"
                  value={systemConfig.logLevel}
                  onChange={value => handleSystemConfigChange('logLevel', value as any)}
                  options={[
                    { value: 'debug', label: 'Debug' },
                    { value: 'info', label: 'Info' },
                    { value: 'warn', label: 'Warning' },
                    { value: 'error', label: 'Error' },
                  ]}
                />
              </div>

              <Input
                label="API URL"
                value={systemConfig.apiUrl}
                onChange={e => handleSystemConfigChange('apiUrl', e.target.value)}
                placeholder="https://api.example.com"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Max Connections"
                  type="number"
                  value={systemConfig.maxConnections}
                  onChange={e => handleSystemConfigChange('maxConnections', parseInt(e.target.value))}
                />

                <Input
                  label="Request Timeout (seconds)"
                  type="number"
                  value={systemConfig.requestTimeout}
                  onChange={e => handleSystemConfigChange('requestTimeout', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Caching Settings */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Caching & Performance</CardTitle>
              <CardDescription>Configure caching behavior and performance settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Enable Caching</p>
                  <p className="text-sm text-text-secondary">Cache frequently accessed data</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${systemConfig.enableCaching ? 'text-brand-accent' : 'text-text-secondary'}`}>
                    {systemConfig.enableCaching ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => handleSystemConfigChange('enableCaching', !systemConfig.enableCaching)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      systemConfig.enableCaching ? 'bg-brand-accent' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        systemConfig.enableCaching ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {systemConfig.enableCaching && (
                <Input
                  label="Cache TTL (seconds)"
                  type="number"
                  value={systemConfig.cacheTtl}
                  onChange={e => handleSystemConfigChange('cacheTtl', parseInt(e.target.value))}
                />
              )}

              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Enable Metrics</p>
                  <p className="text-sm text-text-secondary">Collect system metrics and analytics</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${systemConfig.enableMetrics ? 'text-brand-accent' : 'text-text-secondary'}`}>
                    {systemConfig.enableMetrics ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => handleSystemConfigChange('enableMetrics', !systemConfig.enableMetrics)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      systemConfig.enableMetrics ? 'bg-brand-accent' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        systemConfig.enableMetrics ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {systemConfig.enableMetrics && (
                <Input
                  label="Metrics Collection Interval (seconds)"
                  type="number"
                  value={systemConfig.metricsInterval}
                  onChange={e => handleSystemConfigChange('metricsInterval', parseInt(e.target.value))}
                />
              )}
            </CardContent>
          </Card>

          {/* Maintenance Settings */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>Control system maintenance and user access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Maintenance Mode</p>
                  <p className="text-sm text-text-secondary">Temporarily disable user access</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={systemConfig.maintenanceMode ? 'danger' : 'accent'}
                    dot
                  >
                    {systemConfig.maintenanceMode ? 'Active' : 'Inactive'}
                  </Badge>
                  <button
                    onClick={() => handleSystemConfigChange('maintenanceMode', !systemConfig.maintenanceMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      systemConfig.maintenanceMode ? 'bg-brand-danger' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        systemConfig.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {systemConfig.maintenanceMode && (
                <Input
                  label="Maintenance Message"
                  value={systemConfig.maintenanceMessage}
                  onChange={e => handleSystemConfigChange('maintenanceMessage', e.target.value)}
                  placeholder="Enter message shown to users"
                />
              )}
            </CardContent>
          </Card>

          {/* Backup Settings */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Backup Configuration</CardTitle>
              <CardDescription>Manage automated backups and data retention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Automatic Backups</p>
                  <p className="text-sm text-text-secondary">Enable automated backup scheduling</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${systemConfig.autoBackupEnabled ? 'text-brand-accent' : 'text-text-secondary'}`}>
                    {systemConfig.autoBackupEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => handleSystemConfigChange('autoBackupEnabled', !systemConfig.autoBackupEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      systemConfig.autoBackupEnabled ? 'bg-brand-accent' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        systemConfig.autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <Select
                label="Backup Schedule"
                value={systemConfig.backupSchedule}
                onChange={value => handleSystemConfigChange('backupSchedule', value as any)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />

              <Input
                label="Audit Log Retention (days)"
                type="number"
                value={systemConfig.auditRetentionDays}
                onChange={e => handleSystemConfigChange('auditRetentionDays', parseInt(e.target.value))}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Email Notifications */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email alert settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Email Notifications</p>
                  <p className="text-sm text-text-secondary">Receive alerts via email</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('emailNotifications', !notificationSettings.emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationSettings.emailNotifications ? 'bg-brand-accent' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Slack Integration */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Slack Integration</CardTitle>
              <CardDescription>Send alerts to Slack channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Slack Integration</p>
                  <p className="text-sm text-text-secondary">Enable Slack notifications</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('slackIntegration', !notificationSettings.slackIntegration)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationSettings.slackIntegration ? 'bg-brand-accent' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationSettings.slackIntegration ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {notificationSettings.slackIntegration && (
                <Input
                  label="Slack Channel"
                  value={notificationSettings.slackChannel}
                  onChange={e => handleNotificationChange('slackChannel', e.target.value)}
                  placeholder="#alerts"
                />
              )}
            </CardContent>
          </Card>

          {/* Alert Preferences */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Choose which alerts to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  key: 'criticalAlerts' as const,
                  label: 'Critical Alerts',
                  description: 'System failures and critical errors'
                },
                {
                  key: 'warningAlerts' as const,
                  label: 'Warning Alerts',
                  description: 'Performance degradation and warnings'
                },
                {
                  key: 'infoLogs' as const,
                  label: 'Info Logs',
                  description: 'General informational messages'
                },
              ].map(alert => (
                <div key={alert.key} className="flex items-center justify-between p-3 bg-surface-subtle rounded-lg">
                  <div>
                    <p className="font-medium text-text-primary text-sm">{alert.label}</p>
                    <p className="text-xs text-text-secondary">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange(alert.key, !notificationSettings[alert.key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationSettings[alert.key] ? 'bg-brand-accent' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings[alert.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Alert Threshold */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Alert Threshold</CardTitle>
              <CardDescription>Set the minimum alert severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                label="Severity Threshold"
                value={notificationSettings.alertThreshold}
                onChange={value => handleNotificationChange('alertThreshold', value as any)}
                options={[
                  { value: 'critical', label: 'Critical Only' },
                  { value: 'high', label: 'High and Above' },
                  { value: 'medium', label: 'Medium and Above' },
                  { value: 'low', label: 'All Alerts' },
                ]}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Authentication Settings */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Authentication & Sessions</CardTitle>
              <CardDescription>Manage user authentication policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Two-Factor Authentication</p>
                  <p className="text-sm text-text-secondary">Require 2FA for all users</p>
                </div>
                <button
                  onClick={() => handleSecurityChange('twoFactorAuth', !securitySettings.twoFactorAuth)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.twoFactorAuth ? 'bg-brand-accent' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <Input
                label="Session Timeout (seconds)"
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={e => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
                helperText="Automatic logout after inactivity"
              />

              <Input
                label="Max Login Attempts"
                type="number"
                value={securitySettings.maxLoginAttempts}
                onChange={e => handleSecurityChange('maxLoginAttempts', parseInt(e.target.value))}
                helperText="Before account lockout"
              />
            </CardContent>
          </Card>

          {/* Password Policy */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>Define password requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Minimum Password Length"
                type="number"
                value={securitySettings.passwordMinLength}
                onChange={e => handleSecurityChange('passwordMinLength', parseInt(e.target.value))}
              />

              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Special Characters Required</p>
                  <p className="text-sm text-text-secondary">Require !@#$%^& in passwords</p>
                </div>
                <button
                  onClick={() => handleSecurityChange('passwordRequireSpecial', !securitySettings.passwordRequireSpecial)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.passwordRequireSpecial ? 'bg-brand-accent' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.passwordRequireSpecial ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Network Security */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Network Security</CardTitle>
              <CardDescription>Control network access and CORS settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">Rate Limiting</p>
                  <p className="text-sm text-text-secondary">Protect against abuse attacks</p>
                </div>
                <button
                  onClick={() => handleSecurityChange('enableRateLimit', !securitySettings.enableRateLimit)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.enableRateLimit ? 'bg-brand-accent' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.enableRateLimit ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {securitySettings.enableRateLimit && (
                <Input
                  label="Rate Limit (requests per minute)"
                  type="number"
                  value={securitySettings.rateLimitRequests}
                  onChange={e => handleSecurityChange('rateLimitRequests', parseInt(e.target.value))}
                />
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  IP Whitelist
                </label>
                <textarea
                  value={securitySettings.ipWhitelist.join('\n')}
                  onChange={e => handleSecurityChange('ipWhitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  rows={3}
                  placeholder="Enter IPs/CIDR blocks (one per line)"
                />
                <p className="text-xs text-text-secondary">
                  {securitySettings.ipWhitelist.length} IP(s) configured
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">
                  CORS Origins
                </label>
                <textarea
                  value={securitySettings.corsOrigins.join('\n')}
                  onChange={e => handleSecurityChange('corsOrigins', e.target.value.split('\n').filter(origin => origin.trim()))}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  rows={3}
                  placeholder="Enter allowed origins (one per line)"
                />
                <p className="text-xs text-text-secondary">
                  {securitySettings.corsOrigins.length} origin(s) configured
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Save Section */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 text-brand-accent"
              >
                <span>OK</span>
                <span className="text-sm font-medium">Settings saved successfully</span>
              </motion.div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSystemConfig({
                  systemName: 'Suraksha Admin Portal',
                  environment: 'STAGING',
                  apiUrl: 'https://api.staging.suraksha.io',
                  logLevel: 'info',
                  maxConnections: 1000,
                  requestTimeout: 30,
                  enableCaching: true,
                  cacheTtl: 3600,
                  enableMetrics: true,
                  metricsInterval: 60,
                  maintenanceMode: false,
                  maintenanceMessage: 'System under maintenance. Please try again later.',
                  backupSchedule: 'daily',
                  autoBackupEnabled: true,
                  auditRetentionDays: 90,
                });
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              loading={isSaving}
              onClick={handleSaveSettings}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
