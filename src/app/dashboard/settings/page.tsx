'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { fetchAPI } from '@/hooks/useJobs';
import {
  Globe, Bell, Trash2, FileText, Clock, AlertTriangle,
  User, ArrowRight, Settings as SettingsIcon,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [country, setCountry] = useState(user?.country || 'US');
  const [emailDigest, setEmailDigest] = useState<string>('daily');
  const [jobAlertFreq, setJobAlertFreq] = useState<string>('daily');
  const [defaultFormat, setDefaultFormat] = useState<string>('docx');
  const [defaultPageCount, setDefaultPageCount] = useState<number>(1);
  const [timezone, setTimezone] = useState<string>('');

  useEffect(() => { if (!timezone) setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone); }, [timezone]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const saveSettings = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetchAPI('/profile', { method: 'PUT', body: JSON.stringify(data) });
      if ((res as any).success) { showToast('Settings saved'); refreshUser(); }
      else showToast('Error: ' + ((res as any).error?.message || 'Update failed'));
    } catch { showToast('Network error — please try again'); }
    setSaving(false);
  };

  const updateCountry = (newCountry: string) => { setCountry(newCountry); saveSettings({ country: newCountry }); };

  const savePreferences = () => {
    saveSettings({ _settings: { email_digest: emailDigest, job_alert_frequency: jobAlertFreq, default_resume_format: defaultFormat, default_page_count: defaultPageCount, timezone } });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetchAPI('/profile', { method: 'DELETE' });
      if ((res as any).success) { showToast('Account deletion initiated'); setTimeout(() => signOut(), 2000); }
      else showToast('Error deleting account');
    } catch { showToast('Network error'); }
    setDeleting(false);
  };

  return (
    <AppShell>
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon size={18} className="text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Settings</h1>
        </div>

        {/* Profile link card */}
        <Link href="/dashboard/profile">
          <Card padding="lg" className="mb-4 hover:border-karmio-300 dark:hover:border-karmio-700 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-karmio-100 dark:bg-karmio-900/50 flex items-center justify-center text-sm font-semibold text-karmio-700 dark:text-karmio-300">
                {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{user?.full_name || 'Your Name'}</p>
                <p className="text-xs text-slate-400">{user?.email} · {user?.subscription_tier || 'free'} plan</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-karmio-500 transition-colors" />
            </div>
          </Card>
        </Link>

        {/* Region */}
        <Card padding="lg" className="mb-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-3"><Globe size={16} className="text-slate-400" /> Region</h2>
          <p className="text-xs text-slate-500 mb-3">Controls job sources, salary formats, visa questions, and payment currency.</p>
          <div className="max-w-xs">
            <Select label="Country" value={country} onChange={(e) => updateCountry(e.target.value)}
              options={[
                { value: 'US', label: '🇺🇸 United States' },
                { value: 'IN', label: '🇮🇳 India' },
                { value: 'GB', label: '🇬🇧 United Kingdom' },
                { value: 'CA', label: '🇨🇦 Canada' },
                { value: 'DE', label: '🇩🇪 Germany' },
                { value: 'AU', label: '🇦🇺 Australia' },
                { value: 'SG', label: '🇸🇬 Singapore' },
                { value: 'FR', label: '🇫🇷 France' },
                { value: 'NL', label: '🇳🇱 Netherlands' },
                { value: 'IE', label: '🇮🇪 Ireland' },
              ]} />
          </div>
        </Card>

        {/* Notifications */}
        <Card padding="lg" className="mb-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-3"><Bell size={16} className="text-slate-400" /> Notifications</h2>
          <p className="text-xs text-slate-500 mb-4">Configure how and when Karmio sends you updates.</p>
          <div className="space-y-4">
            <Select label="Email digest" value={emailDigest} onChange={(e) => setEmailDigest(e.target.value)} options={[{ value: 'daily', label: 'Daily summary' }, { value: 'weekly', label: 'Weekly summary' }, { value: 'off', label: 'Off' }]} />
            <Select label="Job alerts" value={jobAlertFreq} onChange={(e) => setJobAlertFreq(e.target.value)} options={[{ value: 'realtime', label: 'Real-time (Pro only)' }, { value: 'daily', label: 'Daily digest' }, { value: 'weekly', label: 'Weekly digest' }]} />
          </div>
        </Card>

        {/* Resume defaults */}
        <Card padding="lg" className="mb-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-3"><FileText size={16} className="text-slate-400" /> Resume defaults</h2>
          <div className="space-y-4">
            <Select label="Default format" value={defaultFormat} onChange={(e) => setDefaultFormat(e.target.value)} options={[{ value: 'docx', label: 'Word (.docx)' }, { value: 'pdf', label: 'PDF (.pdf)' }, { value: 'latex', label: 'LaTeX (.tex)' }]} />
            <Select label="Default page count" value={String(defaultPageCount)} onChange={(e) => setDefaultPageCount(Number(e.target.value))} options={[{ value: '1', label: '1 page' }, { value: '2', label: '2 pages' }]} />
          </div>
        </Card>

        {/* Timezone */}
        <Card padding="lg" className="mb-4">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-3"><Clock size={16} className="text-slate-400" /> Timezone</h2>
          <p className="text-xs text-slate-500 mb-3">Used for follow-up reminders, daily briefings, and weekly usage resets.</p>
          <div className="max-w-xs"><Input label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Detroit" /></div>
        </Card>

        <div className="flex justify-end mb-6">
          <Button variant="primary" onClick={savePreferences} loading={saving}>Save preferences</Button>
        </div>

        {/* Danger zone */}
        <Card padding="lg" className="mb-4 border-red-200 dark:border-red-800/50">
          <h2 className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2 mb-3"><Trash2 size={16} /> Danger zone</h2>
          <p className="text-xs text-slate-500 mb-3">Permanently delete your Karmio account and all associated data. This action cannot be undone.</p>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}><Trash2 size={14} /> Delete my account</Button>
        </Card>

        <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirm(''); }} title="Delete account" size="sm">
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-3">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">This is permanent</p>
                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">All your data will be permanently deleted within 30 days. This cannot be reversed.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type <strong>DELETE</strong> to confirm</label>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteAccount} loading={deleting} disabled={deleteConfirm !== 'DELETE'}>Permanently delete</Button>
            </div>
          </div>
        </Modal>

        {toast && <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">{toast}</div>}
      </div>
    </AppShell>
  );
}