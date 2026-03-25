'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/network?type=messages');
        const json = await res.json();
        if (json.success) setMessages(json.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Messages <Badge variant="info">{messages.length}</Badge>
        </h1>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4"><Skeleton lines={2} /></div>
          ))}</div>
        ) : messages.length > 0 ? (
          <div className="space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">To: {msg.contact_name || 'Unknown'}</p>
                  <Badge>{msg.tone || 'professional'}</Badge>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{msg.content}</p>
                <p className="text-[10px] text-slate-400 mt-2">{msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <MessageSquare size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1">When you generate outreach messages for contacts, they will appear here.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
