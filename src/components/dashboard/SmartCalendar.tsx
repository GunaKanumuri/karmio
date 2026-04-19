'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  ChevronLeft, ChevronRight, Plus, CalendarPlus,
  ExternalLink, Briefcase, FileText, AlertCircle,
  Check, Target, Send, Calendar,
} from 'lucide-react';

// ─── Event type config ───────────────────────────────────────────────────────

export const EVENT_TYPES = [
  { key: 'interview',  label: 'Interview',  dot: 'bg-blue-500',   icon: Briefcase,    lightBg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'assessment', label: 'Assessment', dot: 'bg-indigo-500', icon: FileText,     lightBg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { key: 'deadline',   label: 'Deadline',   dot: 'bg-red-500',    icon: AlertCircle,  lightBg: 'bg-red-50 dark:bg-red-900/20' },
  { key: 'todo',       label: 'To-do',      dot: 'bg-amber-500',  icon: Check,        lightBg: 'bg-amber-50 dark:bg-amber-900/20' },
  { key: 'prep',       label: 'Prep',       dot: 'bg-violet-500', icon: Target,       lightBg: 'bg-violet-50 dark:bg-violet-900/20' },
  { key: 'follow_up',  label: 'Follow-up',  dot: 'bg-emerald-500', icon: Send,        lightBg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'other',      label: 'Other',      dot: 'bg-slate-500',  icon: Calendar,     lightBg: 'bg-slate-50 dark:bg-slate-800/50' },
] as const;

export function getEventConfig(type: string) {
  return EVENT_TYPES.find(e => e.key === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

export function buildGcalUrl(title: string, date: string, time?: string): string {
  const d = date.replace(/-/g, '');
  const t = time ? time.replace(':', '') + '00' : '090000';
  const endHour = time
    ? String(Number(time.split(':')[0]) + 1).padStart(2, '0') + time.split(':')[1] + '00'
    : '100000';
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${d}T${t}/${d}T${endHour}` +
    `&details=${encodeURIComponent('Added from Karmio')}`
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmartCalendarProps {
  eventDatesMap: Record<string, { types: Set<string>; count: number }>;
  calendarEvents: any[];
  followUps: any[];
  applications: any[];
  onEventAdded: () => void;
}

// ─── SmartCalendar ────────────────────────────────────────────────────────────

export function SmartCalendar({
  eventDatesMap,
  calendarEvents,
  followUps,
  applications,
  onEventAdded,
}: SmartCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const items: any[] = [];

    calendarEvents.forEach((e: any) => {
      if (e.event_date === dateStr) {
        items.push({
          id: e.id,
          type: e.event_type,
          title: e.title,
          time: e.time_slot,
          source: 'calendar',
          completed: e.is_completed,
          date: e.event_date,
        });
      }
    });

    followUps
      .filter((f: any) => !f.is_completed)
      .forEach((f: any) => {
        if (new Date(f.due_date).toISOString().slice(0, 10) === dateStr) {
          const app = applications.find((a: any) => a.id === f.application_id);
          items.push({
            id: f.id,
            type: 'follow_up',
            title: `Follow up: ${app?.job?.company_name ?? 'Application'}`,
            source: 'follow_up',
            completed: false,
            date: dateStr,
          });
        }
      });

    return items;
  }, [selectedDate, calendarEvents, followUps, applications]);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{monthName}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Click a date to view or add events</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <ChevronLeft size={13} className="text-slate-400" />
          </button>
          <button
            onClick={nextMonth}
            className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <ChevronRight size={13} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[9px] font-medium text-slate-400 py-0.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const dateEvents = eventDatesMap[date.toDateString()];
          const isPast = date < today && !isToday;

          const dots: string[] = [];
          if (dateEvents) {
            ['interview', 'deadline', 'follow_up', 'todo', 'assessment', 'prep'].forEach(t => {
              if (dateEvents.types.has(t) && dots.length < 3) {
                dots.push(getEventConfig(t).dot);
              }
            });
          }

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(date)}
              className={`relative text-center py-1.5 rounded-lg text-[11px] transition-all ${
                isSelected && !isToday
                  ? 'bg-karmio-100 dark:bg-karmio-900/40 text-karmio-700 dark:text-karmio-300 ring-1 ring-karmio-300 font-bold'
                  : isToday
                  ? 'bg-karmio-500 text-white font-bold'
                  : dateEvents
                  ? 'font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : isPast
                  ? 'text-slate-300 dark:text-slate-600'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {day}
              {dots.length > 0 && !isToday && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-px">
                  {dots.map((c, di) => (
                    <div key={di} className={`w-1 h-1 rounded-full ${c}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {['interview', 'follow_up', 'deadline', 'todo'].map(t => {
          const cfg = getEventConfig(t);
          return (
            <span key={t} className="flex items-center gap-1 text-[8px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Selected date panel */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-karmio-600 bg-karmio-50 dark:bg-karmio-900/20 hover:bg-karmio-100 transition-colors"
          >
            <Plus size={10} /> Add event
          </button>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="text-center py-4">
            <CalendarPlus size={18} className="mx-auto mb-1.5 text-slate-300" />
            <p className="text-[10px] text-slate-400">No events scheduled.</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Add interviews, deadlines, or to-dos.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedDateEvents.map((evt: any) => {
              const cfg = getEventConfig(evt.type);
              const Icon = cfg.icon;
              return (
                <div key={evt.id} className={`flex items-center gap-2 p-2 rounded-lg ${cfg.lightBg}`}>
                  <Icon size={12} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium truncate ${
                      evt.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {evt.title}
                    </p>
                    {evt.time && <p className="text-[9px] text-slate-400">{evt.time}</p>}
                  </div>
                  <a
                    href={buildGcalUrl(evt.title, evt.date, evt.time)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Add to Google Calendar"
                    className="flex-shrink-0 p-1 rounded hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <ExternalLink size={10} className="text-slate-400 hover:text-blue-500" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && selectedDate && (
        <AddEventModal
          date={selectedDate}
          applications={applications}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            onEventAdded();
          }}
        />
      )}
    </div>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

interface AddEventModalProps {
  date: Date;
  applications: any[];
  onClose: () => void;
  onSaved: () => void;
}

function AddEventModal({ date, applications, onClose, onSaved }: AddEventModalProps) {
  const [eventType, setEventType] = useState('interview');
  const [title, setTitle] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [appId, setAppId] = useState('');
  const [saving, setSaving] = useState(false);

  const activeApps = applications.filter((a: any) =>
    ['applied', 'hr_screen', 'technical', 'behavioral', 'final'].includes(a.status)
  );

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    try {
      const linkedApp = activeApps.find((a: any) => a.id === appId);
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date.toISOString().slice(0, 10),
          event_type: eventType,
          title: title.trim(),
          time_slot: timeSlot || null,
          notes: notes || null,
          application_id: appId || null,
          company_name: linkedApp?.job?.company_name ?? null,
        }),
      });
      onSaved();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add event" size="sm">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {/* Event type selector */}
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Type</label>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.filter(t => t.key !== 'other').map(t => (
              <button
                key={t.key}
                onClick={() => setEventType(t.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  eventType === t.key
                    ? 'bg-karmio-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Technical interview with..."
            className="input-field text-sm"
            autoFocus
          />
        </div>

        {/* Time + Application */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
              Time <span className="font-normal text-slate-400">(opt.)</span>
            </label>
            <input
              type="time"
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              className="input-field text-sm"
            />
          </div>
          {activeApps.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Application <span className="font-normal text-slate-400">(opt.)</span>
              </label>
              <select
                value={appId}
                onChange={e => setAppId(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">None</option>
                {activeApps.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.job?.company_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
            Notes <span className="font-normal text-slate-400">(opt.)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Details, links..."
            className="input-field text-sm min-h-[50px] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="btn btn-primary flex-1 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add event'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
