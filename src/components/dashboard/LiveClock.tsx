'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Clock } from 'lucide-react';

// === LiveClock (standalone — used if needed outside TopBar) ===
export function LiveClock({ country = 'US' }: { country?: 'US' | 'IN' }) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  // Country controls locale/format only — timezone is always the browser's local
  const locale = country === 'IN' ? 'en-IN' : 'en-US';

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }));
      setDate(now.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [locale]);

  return (
    <div className="text-right">
      <p className="text-lg font-medium text-slate-900 dark:text-white font-mono tracking-tight">{time}</p>
      <p className="text-xs text-slate-400 mt-0.5">{date}</p>
    </div>
  );
}

// === WeeklyChart ===
interface WeeklyData { label: string; posted: number; applied: number; }

export function WeeklyChart({ data }: { data: WeeklyData[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.posted, d.applied)), 1);

  return (
    <Card>
      <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">Weekly activity</p>
      <div className="h-32 flex items-end gap-1 px-2">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100px' }}>
              <div className="w-3 bg-blue-200 dark:bg-blue-800 rounded-t transition-all" style={{ height: `${(d.posted / maxVal) * 100}%` }} />
              <div className="w-3 bg-emerald-300 dark:bg-emerald-700 rounded-t transition-all" style={{ height: `${(d.applied / maxVal) * 100}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300" />Jobs posted</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Applied</span>
      </div>
    </Card>
  );
}

// === UpcomingCalendar ===
interface CalendarItem {
  date: string;
  label: string;
  urgent?: boolean;
  type?: 'interview' | 'follow_up' | 'deadline';
}

export function UpcomingCalendar({ items }: { items: CalendarItem[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-slate-400" />
        <p className="text-sm font-medium text-slate-900 dark:text-white">Upcoming</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Nothing scheduled. Apply to jobs to see follow-ups here.</p>
      ) : (
        <div className="space-y-0">
          {items.map((item, i) => (
            <div key={i} className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
              <div className="flex justify-between items-center">
                <p className={`text-xs font-medium ${item.urgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {item.date}
                </p>
                {item.urgent && <Badge variant="warning">due</Badge>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}