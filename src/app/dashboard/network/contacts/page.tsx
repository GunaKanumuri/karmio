'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/shared/Helpers';
import { ContactCard } from '@/components/network/ContactCard';
import { MessageCrafter } from '@/components/network/MessageCrafter';
import { useAuth } from '@/hooks/useAuth';
import { useContacts, useAddContact } from '@/hooks/useNetwork';
import { useApplications } from '@/hooks/useApplications';
import { Users, Plus, Search, Filter } from 'lucide-react';

export default function ContactsPage() {
  const { user } = useAuth();
  const { data: contacts = [], isLoading } = useContacts();
  const { data: applications = [] } = useApplications();
  const addContact = useAddContact();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [messageTarget, setMessageTarget] = useState<any>(null);
  const [addForm, setAddForm] = useState({ name: '', title: '', linkedin_url: '', email: '', notes: '', application_id: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = contacts.filter((c: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.title?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && c.connection_status !== statusFilter) return false;
    return true;
  });

  const totalContacts = contacts.length;
  const connected = contacts.filter((c: any) => c.connection_status === 'connected').length;
  const responded = contacts.filter((c: any) => c.connection_status === 'responded').length;
  const pending = contacts.filter((c: any) => c.connection_status === 'pending').length;

  const handleAddContact = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      await addContact.mutateAsync({
        name: addForm.name, title: addForm.title,
        linkedin_url: addForm.linkedin_url || null, email: addForm.email || null,
        notes: addForm.notes || null, application_id: addForm.application_id || null,
      });
      showToast('Contact added');
      setShowAddModal(false);
      setAddForm({ name: '', title: '', linkedin_url: '', email: '', notes: '', application_id: '' });
    } catch { showToast('Failed to add contact'); }
    setSaving(false);
  };

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-slate-400" /> Contacts <Badge variant="info">{totalContacts}</Badge>
          </h1>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add contact</Button>
        </div>

        {totalContacts > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{connected}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Connected</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{responded}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Responded</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{pending}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Pending</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-karmio-500/20 focus:border-karmio-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="connected">Connected</option>
            <option value="responded">Responded</option>
            <option value="no_response">No response</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><Skeleton lines={3} /></Card>)}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((contact: any) => (
              <ContactCard key={contact.id} contact={contact} onMessage={() => setMessageTarget(contact)} />
            ))}
          </div>
        ) : totalContacts > 0 ? (
          <Card><div className="text-center py-8"><Filter size={24} className="mx-auto mb-2 text-slate-300" /><p className="text-sm text-slate-500">No contacts match your filters.</p></div></Card>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Users size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">No contacts yet</p>
              <p className="text-xs text-slate-400 mb-4">Add contacts from companies you&apos;re applying to. Karmio will help you craft outreach messages and track follow-ups.</p>
              <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add your first contact</Button>
            </div>
          </Card>
        )}

        {messageTarget && (
          <MessageCrafter contactName={messageTarget.name} contactTitle={messageTarget.title} companyName={messageTarget.company || ''} roleTitle="" open={!!messageTarget} onClose={() => setMessageTarget(null)} />
        )}

        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add contact" size="md">
          <div className="space-y-4">
            <Input label="Name" placeholder="Jane Smith" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
            <Input label="Title / Role" placeholder="Engineering Manager at Stripe" value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} />
            <Input label="LinkedIn URL" placeholder="https://linkedin.com/in/..." value={addForm.linkedin_url} onChange={(e) => setAddForm({ ...addForm, linkedin_url: e.target.value })} />
            <Input label="Email" placeholder="jane@company.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            {applications.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Link to application</label>
                <select value={addForm.application_id} onChange={(e) => setAddForm({ ...addForm, application_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  <option value="">No application</option>
                  {applications.map((a: any) => <option key={a.id} value={a.id}>{a.job?.company_name || 'Unknown'} — {a.job?.title || 'Unknown role'}</option>)}
                </select>
              </div>
            )}
            <Textarea label="Notes" placeholder="How you found them, mutual connections, etc." value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} rows={2} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAddContact} loading={saving} disabled={!addForm.name.trim()}>Add contact</Button>
            </div>
          </div>
        </Modal>

        {toast && <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">{toast}</div>}
      </div>
    </AppShell>
  );
}