/**
 * Admin → Audit log: who changed what and when. Account actions (suspend,
 * password reset, role changes...) and content edits all land here.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ClipboardList, Download, FileText, Gift, RefreshCw, ScrollText, ShieldCheck, Trash2, Users, Wrench,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { toCsv, downloadCsvFile, csvStamp } from '../../utils/csvExport';
import { formatDateTime, formatDate as formatLocaleDate } from '../../utils/formatDate';
import {
  Avatar, Button, EmptyState, PageHeader, Panel, Pill, SearchBox, SelectBox, Segmented, Skeleton, timeAgo, useDebouncedValue,
} from './kit/kit';
import { ConfirmDialog } from './kit/Overlays';
import { errorText } from './kit/AccountDialogs';
import { actionLabel } from './kit/auditActions';

const CATEGORIES = [
  { key: 'accounts', icon: Users, label: ['k7_catAccounts', 'Accounts'], rx: /account|admin (created|access|enabled|disabled|deleted|removed)|password|session|signed out|user (role|deleted)|^bulk (delete|suspend|reactivate)$|profile/i, tone: 'red' },
  { key: 'bookings', icon: ClipboardList, label: ['k7_catBookings', 'Bookings'], rx: /booking/i, tone: 'blue' },
  { key: 'donations', icon: Gift, label: ['k7_catDonations', 'Donations'], rx: /donation|donor/i, tone: 'green' },
  { key: 'system', icon: Wrench, label: ['k7_catSystem', 'System'], rx: /backup|restore|maintenance|language|db |database|cloud|collection/i, tone: 'amber' },
  { key: 'content', icon: FileText, label: ['k7_catContent', 'Content'], rx: /.*/, tone: 'neutral' },
];

export const categoryOf = (action = '') => CATEGORIES.find((c) => c.rx.test(action)) || CATEGORIES[CATEGORIES.length - 1];

/** One-line summary of a log entry's details. */
const summarise = (a) => {
  const d = a.details || {};
  if (d.targetName || d.targetEmail) {
    const who = d.targetName ? `${d.targetName}${d.targetEmail ? ` (${d.targetEmail})` : ''}` : d.targetEmail;
    const extra = d.reason ? ` — ${d.reason}` : d.fields ? ` — ${d.fields.join(', ')}` : d.access ? ` — ${Array.isArray(d.access) ? d.access.join(', ') || 'no areas' : d.access}` : '';
    return `${who}${extra}`;
  }
  if (d.count !== undefined) return `${d.count} account(s)${d.sample?.length ? `: ${d.sample.join(', ')}` : ''}`;
  const entries = Object.entries(d).filter(([, v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'object');
  return entries.slice(0, 3).map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`).join(' · ');
};

const dayLabel = (iso, t, lang) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t.today || 'Today';
  if (d.toDateString() === yest.toDateString()) return t.k7_yesterday || 'Yesterday';
  return formatLocaleDate(d, lang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const AdminAudit = ({ t = {} }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isSuper = user?.role === 'superadmin';

  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [who, setWho] = useState('');
  const [range, setRange] = useState('');
  const [open, setOpen] = useState({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const q = useDebouncedValue(search, 300);

  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const params = { limit: 500 };
      if (q.trim()) params.search = q.trim();
      if (range) params.from = new Date(Date.now() - Number(range) * 86400000).toISOString();
      const [list, st] = await Promise.all([
        api.get('/admin/activity', { params }),
        api.get('/admin/activity/stats').catch(() => null),
      ]);
      // A slower, older request must not overwrite the answer to the current filters.
      if (id !== reqId.current) return;
      setEntries(Array.isArray(list.data) ? list.data : []);
      setStats(st?.data?.data || null);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(errorText(err, t.k7_loadAuditFailed || 'Could not load the audit log'));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [q, range, t.k7_loadAuditFailed]);

  useEffect(() => { load(); }, [load]);

  const people = useMemo(() => {
    const m = new Map();
    entries.forEach((e) => { const id = e.user?.id || e.adminId; if (id && !m.has(String(id))) m.set(String(id), e.user?.name || e.user?.email || 'Admin'); });
    return [...m.entries()];
  }, [entries]);

  // If the chosen admin has no entries under the new search / period, the filter would
  // hide everything while the dropdown looks unset. Drop it.
  useEffect(() => {
    if (who && !people.some(([id]) => id === who)) setWho('');
  }, [people, who]);

  const counts = useMemo(() => {
    const c = { all: entries.length };
    CATEGORIES.forEach((cat) => { c[cat.key] = 0; });
    entries.forEach((e) => { c[categoryOf(e.action).key] += 1; });
    return c;
  }, [entries]);

  const visible = entries.filter((e) => {
    if (category !== 'all' && categoryOf(e.action).key !== category) return false;
    if (who && String(e.user?.id || e.adminId) !== who) return false;
    return true;
  });

  const groups = useMemo(() => {
    const g = [];
    visible.forEach((e) => {
      const label = dayLabel(e.timestamp, t, lang);
      if (!g.length || g[g.length - 1].label !== label) g.push({ label, items: [] });
      g[g.length - 1].items.push(e);
    });
    return g;
  }, [visible, t, lang]);

  const exportCsv = () => {
    const columns = [
      { key: 'timestamp', label: t.k7_when || 'When', value: (e) => formatDateTime(e.timestamp) },
      { key: 'who', label: t.k7_who || 'Who', value: (e) => e.user?.name || '' },
      { key: 'email', label: t.email || 'Email', value: (e) => e.user?.email || '' },
      { key: 'action', label: t.k7_action || 'Action', value: (e) => actionLabel(e.action, t) },
      { key: 'summary', label: t.k7_details || 'Details', value: summarise },
    ];
    downloadCsvFile(`audit-log-${csvStamp()}.csv`, toCsv(columns, visible));
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      await api.delete('/admin/activity');
      showToast(t.a6_logsCleared || 'All logs cleared', 'success');
      setConfirmClear(false);
      load();
    } catch (err) {
      showToast(errorText(err, t.a6_logsClearFailed || 'Failed to clear logs'), 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t.k7_auditLog || 'Audit log'}
        description={t.k7_auditDesc || 'A record of what admins did: account changes, content edits, approvals. Use it to answer who changed something, and when.'}
        actions={
          <>
            <Button icon={RefreshCw} onClick={load} loading={loading && entries.length > 0}>{t.a1_settingsRefresh || 'Refresh'}</Button>
            <Button icon={Download} onClick={exportCsv} disabled={!visible.length}>{t.k7_exportCsv || 'Export CSV'}</Button>
            {isSuper && <Button variant="danger" icon={Trash2} onClick={() => setConfirmClear(true)} disabled={!entries.length}>{t.a1_settingsClearLogs || 'Clear log'}</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t.today || 'Today', stats?.today],
          [t.a1_settingsWeek || 'This week', stats?.thisWeek],
          [t.month || 'This month', stats?.thisMonth],
          [t.k7_stored || 'Stored', stats?.stored],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              className="min-w-[220px] flex-1"
              value={search}
              onChange={setSearch}
              placeholder={t.k7_searchAudit || 'Search actions, admins or people'}
              aria-label={t.k7_searchAudit || 'Search actions, admins or people'}
            />
            <SelectBox className="w-auto min-w-[150px]" aria-label={t.k7_who || 'Who'} value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">{t.k7_anyAdmin || 'Any admin'}</option>
              {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </SelectBox>
            <SelectBox className="w-auto min-w-[140px]" aria-label={t.k7_period || 'Period'} value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="">{t.downloadAllTime || 'All time'}</option>
              <option value="1">{t.k7_last24h || 'Last 24 hours'}</option>
              <option value="7">{t.k7_last7d || 'Last 7 days'}</option>
              <option value="30">{t.k7_last30d || 'Last 30 days'}</option>
            </SelectBox>
          </div>
          <Segmented
            label={t.k7_category || 'Category'}
            value={category}
            onChange={setCategory}
            options={[
              { value: 'all', label: t.k7_all || 'All', count: counts.all },
              ...CATEGORIES.map((c) => ({ value: c.key, label: t[c.label[0]] || c.label[1], count: counts[c.key] })),
            ]}
          />
        </div>

        {error && <p className="p-6 text-center text-sm text-red-600">{error} <button type="button" onClick={load} className="ml-2 font-semibold underline">{t.k7_retry || 'Retry'}</button></p>}

        {loading && !entries.length ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !error && visible.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={entries.length ? (t.k7_noMatchAudit || 'Nothing matches these filters') : (t.a1_settingsNoActivity || 'No admin activity recorded yet')}
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            {groups.map((g) => (
              <section key={g.label}>
                <h3 className="sticky top-0 z-[1] border-b border-line bg-gray-50/90 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft backdrop-blur">{g.label}</h3>
                <ul className="divide-y divide-line">
                  {g.items.map((e) => {
                    const cat = categoryOf(e.action);
                    const Icon = cat.icon;
                    const expandable = e.details && Object.keys(e.details).length > 0;
                    const isOpen = !!open[e._id];
                    return (
                      <li key={e._id} className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-vermilion">
                            <Icon size={15} aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                              {actionLabel(e.action, t)}
                              <Pill tone={cat.tone}>{t[cat.label[0]] || cat.label[1]}</Pill>
                            </p>
                            {summarise(e) && <p className="mt-0.5 break-words text-sm text-ink-soft">{summarise(e)}</p>}
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                              <span className="inline-flex items-center gap-1.5">
                                <Avatar user={{ name: e.user?.name }} size={16} />
                                {e.user?.name || 'Admin'}
                              </span>
                              <time dateTime={e.timestamp} title={formatDateTime(e.timestamp)}>{timeAgo(e.timestamp, t, lang)}</time>
                              {expandable && (
                                <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [e._id]: !isOpen }))} className="inline-flex items-center gap-0.5 font-semibold text-ink-soft hover:text-vermilion">
                                  {t.k7_rawDetails || 'Raw details'} <ChevronDown size={12} className={isOpen ? 'rotate-180' : ''} aria-hidden="true" />
                                </button>
                              )}
                            </p>
                            {isOpen && (
                              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-ink-soft">{JSON.stringify(e.details, null, 2)}</pre>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="flex items-center gap-1.5 border-t border-line px-5 py-3 text-xs text-mute">
          <ShieldCheck size={13} aria-hidden="true" />
          {(t.k7_retentionNote || 'The latest {n} entries are kept; older ones are removed automatically.').replace('{n}', stats?.retention || 500)}
        </p>
      </Panel>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => !clearing && setConfirmClear(false)}
        busy={clearing}
        title={t.k7_clearAuditTitle || 'Clear the whole audit log?'}
        message={t.k7_clearAuditMsg || 'This removes every entry, including the record of account changes. It cannot be undone.'}
        requireText="CLEAR"
        confirmLabel={t.a1_settingsClearLogs || 'Clear log'}
        cancelLabel={t.cancel || 'Cancel'}
        onConfirm={clearAll}
      />
    </div>
  );
};

export default AdminAudit;
