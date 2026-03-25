'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Users, Linkedin, Mail } from 'lucide-react';

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', title: '', email: '', linkedin_url: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/network?type=contacts');
      const json = await res.json();
      if (json.success) setContacts(json.data || []);
    } catch {}
    setLoading(false);
  };

  const addContact = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await fetch('/api/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', ...form }),
      });
      await fetchContacts();
      setShowAdd(false);
      setForm({ name: '', company: '', title: '', email: '', linkedin_url: '', notes: '' });
    } catch {}
    setSaving(false);
  };

  const filtered = contacts.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-white">
            Contacts <Badge variant="info">{contacts.length}</Badge>
          </h1>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" />Add contact</Button>
        </div>

        <div className="mb-4">
          <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4"><Skeleton lines={2} /></div>
          ))}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map(contact => (
              <div key={contact.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-karmio-100 dark:bg-karmio-900 flex items-center justify-center text-xs font-medium text-karmio-700 dark:text-karmio-300 flex-shrink-0">
                    {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                    <p className="text-xs text-slate-500">{contact.title ? `${contact.title} at ` : ''}{contact.company || 'No company'}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost"><Linkedin size={14} /></Button>
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`}>
                      <Button size="sm" variant="ghost"><Mail size={14} /></Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <Users size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No contacts yet</p>
            <p className="text-xs text-slate-400 mt-1">Add contacts you meet during your job search to track networking efforts.</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowAdd(true)}>Add your first contact</Button>
          </div>
        )}

        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add contact">
          <div className="space-y-4">
            <Input label="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input label="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="LinkedIn URL" value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={addContact}>Add contact</Button>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
