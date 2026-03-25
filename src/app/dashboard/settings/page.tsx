'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Shield, Globe, Bell, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [country, setCountry] = useState(user?.country || 'US');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateCountry = async (newCountry: 'US' | 'IN') => {
    setCountry(newCountry);
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: newCountry }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Country updated');
        refreshUser();
      }
    } catch {
      showToast('Error updating country');
    }
    setSaving(false);
  };

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-6">Settings</h1>

        {/* Account */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Shield size={16} className="text-slate-400" /> Account
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{user?.email || 'Not set'}</p>
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Name</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{user?.full_name || 'Not set'}</p>
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Subscription</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {(user?.subscription_tier || 'free').charAt(0).toUpperCase() + (user?.subscription_tier || 'free').slice(1)} plan
                  <Badge variant={user?.subscription_tier === 'pro' ? 'success' : user?.subscription_tier === 'popular' ? 'info' : 'default'} className="ml-2">
                    {user?.subscription_tier || 'free'}
                  </Badge>
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-xs text-slate-400">Member since</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Region */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Globe size={16} className="text-slate-400" /> Region
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            This controls which job sources, salary formats, and features you see.
          </p>
          <div className="max-w-xs">
            <Select label="Country" value={country} onChange={e => updateCountry(e.target.value as 'US' | 'IN')}
              options={[
                { value: 'US', label: '🇺🇸 United States' },
                { value: 'IN', label: '🇮🇳 India' },
              ]} />
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <LogOut size={16} className="text-slate-400" /> Session
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Sign out of your Karmio account on this device.
          </p>
          <Button variant="danger" onClick={signOut}>
            <LogOut size={14} className="mr-1" /> Sign out
          </Button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50">
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}
