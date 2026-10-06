import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CalendarDays, Download, Mail, MailCheck, MailX, Newspaper, PartyPopper, RefreshCw, Send, Trash2, Users, Clock,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate } from '../../utils/formatDate';
import {
  Button, EmptyState, Field, PageHeader, Pagination, Panel, PanelHeader, Pill, SearchBox, Segmented, SelectBox, Skeleton, StatTile,
  Toggle, cx, fullDate, inputCls, useDebouncedValue,
} from './kit/kit';

/**
 * Admin → Subscribers & mail. Who subscribed through "Stay updated", the mailings that go to them (new events and
 * blog posts automatically, anything else by hand), and the festival wishes sent on the day. The pages are written
 * in English on purpose: only the people who run the temple site read them.
 */

const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'ne', label: 'नेपाली' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'zh', label: '中文' },
  { id: 'ta', label: 'தமிழ்' },
];
const TOPIC_LABEL = { events: 'Events', festivals: 'Festival wishes', news: 'News' };
const STATUS_TONE = { active: 'green', pending: 'amber', unsubscribed: 'neutral' };
const STATUS_LABEL = { active: 'Active', pending: 'Waiting for confirmation', unsubscribed: 'Unsubscribed' };
const CAMPAIGN_TONE = { queued: 'blue', sending: 'blue', done: 'green', failed: 'danger', cancelled: 'neutral' };
const KIND_LABEL = { event: 'Event', blog: 'Blog post', festival: 'Festival wish', custom: 'Message' };
const errorOf = (error, fallback) => error?.response?.data?.message || fallback;
const pick = (obj) => (obj && (obj.en || obj.ne)) || '';

/* ---------------------------------------------------------------- subscribers ---- */

const SubscribersTab = ({ onChanged }) => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 350);
  const [loading, setLoading] = useState(true);
  const limit = 25;
  const latest = useRef(0); // only the newest request may change the list (replies can arrive out of order)

  const load = useCallback(async () => {
    const mine = (latest.current += 1);
    setLoading(true);
    try {
      const res = await api.get('/newsletter/subscribers', { params: { page, limit, status, topic, q } });
      if (mine !== latest.current) return;
      const last = res.data.pages || 1;
      // The last row of the last page was removed (or the filter now matches less): step back to the last page that exists.
      if (page > last) { setPage(last); return; }
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
      setPages(last);
    } catch (error) {
      if (mine === latest.current) showToast(errorOf(error, 'Could not load the subscribers'), 'error');
    } finally {
      if (mine === latest.current) setLoading(false);
    }
  }, [page, status, topic, q, showToast]);

  useEffect(() => { load(); }, [load]);
  // a new filter or search starts again at page 1 (set together with the filter, so no request goes out for the old page)
  const withFirstPage = (setter) => (value) => { setPage(1); setter(value); };

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.email} from the list? They will not receive any more mail (they can subscribe again).`)) return;
    try {
      await api.delete(`/newsletter/subscribers/${row._id}`);
      showToast('Subscriber removed', 'success');
      await load();
      onChanged();
    } catch (error) {
      showToast(errorOf(error, 'Could not remove the subscriber'), 'error');
    }
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <SearchBox value={query} onChange={withFirstPage(setQuery)} placeholder="Search by e-mail" aria-label="Search by e-mail" className="w-full sm:w-64" />
        <Segmented
          label="Status"
          value={status}
          onChange={withFirstPage(setStatus)}
          options={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Waiting' }, { value: 'unsubscribed', label: 'Left' }]}
        />
        <SelectBox value={topic} onChange={(e) => withFirstPage(setTopic)(e.target.value)} className="w-auto" aria-label="Topic">
          <option value="">Any topic</option>
          {Object.entries(TOPIC_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </SelectBox>
      </div>

      {loading && !rows.length ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : !rows.length ? (
        <EmptyState icon={Users} title="No subscribers here" text={status || topic || q ? 'Nobody matches these filters.' : 'People who use "Stay updated" on the website appear here.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Topics</th>
                <th className="px-4 py-2.5 font-medium">Language</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row._id}>
                  <td className="max-w-[16rem] truncate px-4 py-3 font-medium text-ink" title={row.email}>{row.email}</td>
                  <td className="px-4 py-3"><Pill tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status] || row.status}</Pill></td>
                  <td className="px-4 py-3 text-ink-soft">{(row.topics || []).map((x) => TOPIC_LABEL[x] || x).join(', ') || '—'}</td>
                  <td className="px-4 py-3 uppercase text-ink-soft">{row.lang}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{fullDate(row.subscribedAt, lang)}</td>
                  <td className="px-2 py-3 text-right">
                    <button type="button" onClick={() => remove(row)} aria-label={`Remove ${row.email}`} title="Remove" className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-4 py-3">
        <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} t={{}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------- sending ---- */

const SendTab = ({ overview, onSettings, goHistory }) => {
  const { showToast } = useToast();
  const [kind, setKind] = useState('event');
  const [events, setEvents] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [eventId, setEventId] = useState('');
  const [blogId, setBlogId] = useState('');
  const [custom, setCustom] = useState({ topic: 'news', subjectEn: '', subjectNe: '', bodyEn: '', bodyNe: '', url: '', buttonEn: '', buttonNe: '' });
  const [audience, setAudience] = useState(null);
  const [testLang, setTestLang] = useState('en');
  const [busy, setBusy] = useState('');
  const [cap, setCap] = useState(String(overview?.settings?.dailyCap ?? 400));

  useEffect(() => {
    api.get('/events').then((res) => setEvents(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    api.get('/admin/blogs').then((res) => setBlogs((res.data?.data || []).filter((b) => b.published !== false))).catch(() => {});
  }, []);
  useEffect(() => { setCap(String(overview?.settings?.dailyCap ?? 400)); }, [overview?.settings?.dailyCap]);

  const topic = kind === 'event' ? 'events' : kind === 'blog' ? 'news' : custom.topic;
  useEffect(() => {
    let live = true;
    api.get('/newsletter/audience', { params: { topic } }).then((res) => { if (live) setAudience(res.data?.data?.count ?? 0); }).catch(() => { if (live) setAudience(null); });
    return () => { live = false; };
  }, [topic]);

  const setField = (field) => (e) => setCustom((c) => ({ ...c, [field]: e.target.value }));
  const payload = () => {
    if (kind === 'event') return { kind, eventId };
    if (kind === 'blog') return { kind, blogId };
    return {
      kind,
      topic: custom.topic,
      subject: { en: custom.subjectEn, ne: custom.subjectNe },
      body: { en: custom.bodyEn, ne: custom.bodyNe },
      url: custom.url,
      buttonLabel: { en: custom.buttonEn, ne: custom.buttonNe },
    };
  };
  const ready = kind === 'event' ? !!eventId : kind === 'blog' ? !!blogId : !!(custom.subjectEn.trim() && custom.bodyEn.trim());

  const sendTest = async () => {
    setBusy('test');
    try {
      const res = await api.post('/newsletter/test', { ...payload(), lang: testLang });
      showToast(`A test was sent to ${res.data?.data?.to || 'your address'}`, 'success');
    } catch (error) {
      showToast(errorOf(error, 'The test could not be sent'), 'error');
    } finally {
      setBusy('');
    }
  };

  const send = async (resend = false) => {
    if (!resend && !window.confirm(`Send this to ${audience ?? 'all'} subscriber${audience === 1 ? '' : 's'} now? It cannot be taken back once it is on its way.`)) return;
    setBusy('send');
    try {
      await api.post('/newsletter/announce', { ...payload(), resend });
      showToast('Queued: the mail goes out in the background, a few every minute', 'success');
      goHistory();
    } catch (error) {
      if (error?.response?.data?.code === 'ALREADY_SENT') {
        if (window.confirm('This was already mailed to the subscribers. Send it again?')) { setBusy(''); await send(true); return; }
      } else {
        showToast(errorOf(error, 'Could not queue the mailing'), 'error');
      }
    } finally {
      setBusy('');
    }
  };

  const saveSetting = async (body, okText = 'Saved') => {
    try {
      await api.put('/newsletter/settings', body);
      showToast(okText, 'success');
      onSettings();
    } catch (error) {
      showToast(errorOf(error, 'Could not save'), 'error');
    }
  };
  const s = overview?.settings || {};

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <Panel>
        <PanelHeader icon={Send} title="Send a mailing" description="Choose what to send. Send yourself a test first: nothing reaches the subscribers until you press Send." />
        <div className="space-y-5 p-5">
          <Segmented
            label="What to send"
            value={kind}
            onChange={setKind}
            options={[{ value: 'event', label: 'An event' }, { value: 'blog', label: 'A blog post' }, { value: 'custom', label: 'Your own message' }]}
          />

          {kind === 'event' && (
            <Field label="Event" htmlFor="nl-event">
              <SelectBox id="nl-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Choose an event…</option>
                {events.map((ev) => <option key={ev._id} value={ev._id}>{pick(ev.title) || 'Event'} · {ev.date || ''}</option>)}
              </SelectBox>
            </Field>
          )}
          {kind === 'blog' && (
            <Field label="Published blog post" htmlFor="nl-blog">
              <SelectBox id="nl-blog" value={blogId} onChange={(e) => setBlogId(e.target.value)}>
                <option value="">Choose a post…</option>
                {blogs.map((b) => <option key={b._id} value={b._id}>{pick(b.title) || 'Blog post'}</option>)}
              </SelectBox>
            </Field>
          )}
          {kind === 'custom' && (
            <div className="space-y-4">
              <Field label="Send to people who chose" htmlFor="nl-topic">
                <SelectBox id="nl-topic" value={custom.topic} onChange={setField('topic')} className="w-auto">
                  {Object.entries(TOPIC_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </SelectBox>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Subject (English)" htmlFor="nl-sub-en"><input id="nl-sub-en" maxLength={200} className={inputCls} value={custom.subjectEn} onChange={setField('subjectEn')} /></Field>
                <Field label="Subject (Nepali, optional)" htmlFor="nl-sub-ne"><input id="nl-sub-ne" maxLength={200} className={inputCls} value={custom.subjectNe} onChange={setField('subjectNe')} /></Field>
                <Field label="Message (English)" htmlFor="nl-body-en"><textarea id="nl-body-en" rows={6} maxLength={5000} className={cx(inputCls, 'h-auto py-2')} value={custom.bodyEn} onChange={setField('bodyEn')} /></Field>
                <Field label="Message (Nepali, optional)" htmlFor="nl-body-ne"><textarea id="nl-body-ne" rows={6} maxLength={5000} className={cx(inputCls, 'h-auto py-2')} value={custom.bodyNe} onChange={setField('bodyNe')} /></Field>
              </div>
              <p className="text-xs text-mute">People who read Hindi, Chinese or Tamil receive the Nepali text if you wrote one, otherwise the English. A blank line starts a new paragraph.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Button link (optional)" hint="Must start with https://" htmlFor="nl-url" className="sm:col-span-2"><input id="nl-url" type="url" maxLength={500} placeholder="https://" className={inputCls} value={custom.url} onChange={setField('url')} /></Field>
                <Field label="Button text" htmlFor="nl-btn"><input id="nl-btn" maxLength={60} placeholder="Read more" className={inputCls} value={custom.buttonEn} onChange={setField('buttonEn')} /></Field>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <p className="mr-auto text-sm text-ink-soft">
              <Users size={14} className="mr-1.5 inline -translate-y-px text-vermilion" aria-hidden="true" />
              {audience === null ? 'Counting…' : <>This goes to <strong className="text-ink">{audience}</strong> active subscriber{audience === 1 ? '' : 's'} who chose “{TOPIC_LABEL[topic]}”.</>}
            </p>
            <SelectBox value={testLang} onChange={(e) => setTestLang(e.target.value)} className="w-auto" aria-label="Language of the test">
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </SelectBox>
            <Button icon={Mail} disabled={!ready} loading={busy === 'test'} onClick={sendTest}>Send me a test</Button>
            <Button variant="primary" icon={Send} disabled={!ready || !audience} loading={busy === 'send'} onClick={() => send(false)}>Send to subscribers</Button>
          </div>
        </div>
      </Panel>

      <Panel className="self-start">
        <PanelHeader icon={Clock} title="Automatic mail" description="What goes out without you pressing anything." />
        <div className="space-y-4 p-5 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-medium text-ink">New events</p><p className="text-xs text-ink-soft">Mailed once when you add an event in Admin → Events.</p></div>
            <Toggle checked={!!s.autoEvents} onChange={(v) => saveSetting({ autoEvents: v })} label="Mail new events automatically" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-medium text-ink">Blog posts</p><p className="text-xs text-ink-soft">Mailed once when a post is published (never again if you switch it off and on).</p></div>
            <Toggle checked={!!s.autoBlogs} onChange={(v) => saveSetting({ autoBlogs: v })} label="Mail published blog posts automatically" />
          </div>
          <div className="border-t border-line pt-4">
            <Field label="Daily sending limit" hint={`Gmail allows roughly 500 messages a day, and the same account also sends sign-in codes, bookings and reminders: keep this well below that. A big mailing carries on the next day. Sent today: ${s.sentToday ?? 0}.`} htmlFor="nl-cap">
              <div className="flex gap-2">
                <input id="nl-cap" type="number" min={1} max={5000} className={inputCls} value={cap} onChange={(e) => setCap(e.target.value)} />
                <Button disabled={String(s.dailyCap) === cap} onClick={() => saveSetting({ dailyCap: Number(cap) })}>Save</Button>
              </div>
            </Field>
          </div>
        </div>
      </Panel>
    </div>
  );
};

/* ----------------------------------------------------------- festival wishes ---- */

const FestivalRow = ({ f, onSaved, lang }) => {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState({ en: '', ne: '', hi: '', zh: '', ta: '', ...(f.messages || {}) });
  const [busy, setBusy] = useState('');
  const [testLang, setTestLang] = useState('en');

  const save = async (body) => {
    setBusy('save');
    try {
      await api.put(`/newsletter/festivals/${f.key}`, body);
      showToast('Saved', 'success');
      onSaved();
    } catch (error) {
      showToast(errorOf(error, 'Could not save'), 'error');
    } finally {
      setBusy('');
    }
  };
  const test = async () => {
    setBusy('test');
    try {
      const messages = Object.fromEntries(Object.entries(text).filter(([, v]) => v.trim()));
      const res = await api.post('/newsletter/test', { kind: 'festival', lang: testLang, nameEn: f.nameEn, nameNe: f.nameNe, messages });
      showToast(`A test was sent to ${res.data?.data?.to || 'your address'}`, 'success');
    } catch (error) {
      showToast(errorOf(error, 'The test could not be sent'), 'error');
    } finally {
      setBusy('');
    }
  };
  const date = new Date(`${f.date}T00:00:00`);
  const hasOwn = !!(f.messages && Object.keys(f.messages).length);

  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="w-28 shrink-0 text-sm text-ink-soft">{formatDate(date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}<span className="block text-xs text-mute">{f.date.slice(0, 4)}</span></div>
        <div className="min-w-[11rem] flex-1 basis-48">
          <p className="font-medium text-ink">{f.nameEn}{f.nameNe && <span className="ml-2 text-sm font-normal text-ink-soft">{f.nameNe}</span>}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {!f.defaultOn && <Pill>Optional · off by default</Pill>}
            {hasOwn && <Pill tone="red">Own wording</Pill>}
            {f.sent && <Pill tone="green">Sent</Pill>}
            {f.campaignStatus === 'queued' && <Pill tone="blue">Queued</Pill>}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? 'Close' : 'Wording'}</Button>
        <Toggle checked={f.enabled} disabled={busy === 'save' || f.sent} onChange={(v) => save({ enabled: v, ...(hasOwn ? { message: f.messages } : {}) })} label={`Send a wish for ${f.nameEn}`} />
      </div>
      {open && (
        <div className="mt-3 rounded-lg border border-line bg-panel p-4">
          <p className="mb-3 text-xs text-ink-soft">Write your own wish for this festival, in any of the languages. Leave a language empty to use the temple’s standard wording for it.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {LANGS.map((l) => (
              <Field key={l.id} label={l.label} htmlFor={`${f.key}-${l.id}`}>
                <textarea id={`${f.key}-${l.id}`} rows={3} maxLength={1500} className={cx(inputCls, 'h-auto bg-white py-2')} value={text[l.id]} onChange={(e) => setText((x) => ({ ...x, [l.id]: e.target.value }))} />
              </Field>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" loading={busy === 'save'} onClick={() => save({ enabled: f.enabled, message: Object.fromEntries(Object.entries(text).filter(([, v]) => v.trim())) })}>Save wording</Button>
            <SelectBox value={testLang} onChange={(e) => setTestLang(e.target.value)} className="ml-auto w-auto" aria-label="Language of the test">
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </SelectBox>
            <Button icon={Mail} loading={busy === 'test'} onClick={test}>Send me a test</Button>
          </div>
        </div>
      )}
    </li>
  );
};

const FestivalsTab = ({ overview, onSettings }) => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/newsletter/festivals', { params: { days: 200 } });
      setList(res.data.data || []);
    } catch (e) {
      setList([]);
      setError(errorOf(e, 'The festival calendar could not be loaded.'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const master = overview?.settings?.festivalWishesEnabled !== false;
  const toggleMaster = async (value) => {
    try {
      await api.put('/newsletter/settings', { festivalWishesEnabled: value });
      showToast(value ? 'Festival wishes are on' : 'Festival wishes are off', 'success');
      onSettings();
    } catch (e) {
      showToast(errorOf(e, 'Could not save'), 'error');
    }
  };

  return (
    <Panel>
      <PanelHeader
        icon={PartyPopper}
        title="Festival wishes"
        description="Sent automatically on the day of the festival, around 6 am Nepal time, to everyone who chose “Festival wishes”."
        actions={<div className="flex items-center gap-2 text-sm font-medium text-ink"><span>{master ? 'On' : 'Off'}</span><Toggle checked={master} onChange={toggleMaster} label="Send festival wishes" /></div>}
      />
      {list === null ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load the calendar" text={error} action={<Button icon={RefreshCw} onClick={load}>Try again</Button>} />
      ) : !list.length ? (
        <EmptyState icon={CalendarDays} title="No festivals found" text="Nothing to show for the next months." />
      ) : (
        <ul className={cx('divide-y divide-line', !master && 'opacity-60')}>
          {list.map((f) => <FestivalRow key={`${f.date}-${f.key}`} f={f} lang={lang} onSaved={() => { load(); }} />)}
        </ul>
      )}
    </Panel>
  );
};

/* ------------------------------------------------------------------- history ---- */

const HistoryTab = () => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/newsletter/campaigns');
      setRows(res.data.data || []);
    } catch (error) {
      setRows((r) => r || []);
      showToast(errorOf(error, 'Could not load the history'), 'error');
    }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);
  // while something is going out, keep the numbers fresh
  const active = !!rows?.some((r) => r.status === 'queued' || r.status === 'sending');
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [active, load]);

  const act = async (row, what) => {
    if (what === 'cancel' && !window.confirm('Stop this mailing? People who have not received it yet will not get it.')) return;
    try {
      await api.post(`/newsletter/campaigns/${row._id}/${what}`);
      showToast(what === 'cancel' ? 'Mailing stopped' : 'Trying again', 'success');
      await load();
    } catch (error) {
      showToast(errorOf(error, 'Could not do that'), 'error');
    }
  };

  return (
    <Panel>
      <PanelHeader
        icon={Newspaper}
        title="Mailings"
        description="The latest mailings and how far each one got."
        actions={<Button size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>}
      />
      {rows === null ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !rows.length ? (
        <EmptyState icon={MailCheck} title="Nothing sent yet" text="Mailings appear here when you send one, add an event, or a festival wish goes out." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => {
            const done = (row.stats?.sent || 0) + (row.stats?.failed || 0) + (row.stats?.skipped || 0);
            const pct = row.stats?.total ? Math.min(100, Math.round((done / row.stats.total) * 100)) : row.status === 'done' ? 100 : 0;
            return (
              <li key={row._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-ink">{row.label || KIND_LABEL[row.kind]}</p>
                    <Pill>{KIND_LABEL[row.kind] || row.kind}</Pill>
                    <Pill tone={CAMPAIGN_TONE[row.status]}>{row.status}</Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {fullDate(row.createdAt, lang)} · {TOPIC_LABEL[row.topic] || row.topic} · sent {row.stats?.sent || 0} of {row.stats?.total || 0}
                    {row.stats?.failed ? ` · ${row.stats.failed} failed` : ''}{row.stats?.skipped ? ` · ${row.stats.skipped} skipped` : ''}
                  </p>
                  {(row.status === 'sending' || row.status === 'queued') && (
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-vermilion transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {row.error && <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700"><AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{row.error}</p>}
                </div>
                <div className="flex gap-2">
                  {row.status === 'failed' && <Button size="sm" icon={RefreshCw} onClick={() => act(row, 'retry')}>Try again</Button>}
                  {['queued', 'sending', 'failed'].includes(row.status) && <Button size="sm" variant="danger" icon={MailX} onClick={() => act(row, 'cancel')}>Stop</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

/* ---------------------------------------------------------------------- page ---- */

const AdminNewsletter = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState('subscribers');
  const [overview, setOverview] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.get('/newsletter/overview');
      setOverview(res.data.data);
    } catch (error) {
      showToast(errorOf(error, 'Could not load the subscriber numbers'), 'error');
    }
  }, [showToast]);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/newsletter/subscribers.csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (error) {
      showToast(errorOf(error, 'The export failed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const counts = overview?.counts;
  const tabs = useMemo(() => [
    { value: 'subscribers', label: 'Subscribers' },
    { value: 'send', label: 'Send a mailing' },
    { value: 'festivals', label: 'Festival wishes' },
    { value: 'history', label: 'History' },
  ], []);

  return (
    <div>
      <PageHeader
        title="Subscribers & mail"
        description="People who joined through “Stay updated” on the website, and the mail the temple sends them: new events, blog posts and festival wishes."
        actions={<Button icon={Download} loading={exporting} onClick={exportCsv}>Export list (CSV)</Button>}
      />

      {overview && !overview.emailReady && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>E-mail is not set up on the server (<code>EMAIL_USER</code> and <code>EMAIL_PASS</code> are missing), so no confirmation or mailing can be sent yet. Subscribers will stay “waiting for confirmation” until it is.</p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={MailCheck} label="Active" value={counts ? counts.active : '–'} tone="good" hint="Receive the mail" />
        <StatTile icon={Clock} label="Waiting" value={counts ? counts.pending : '–'} hint="Have not confirmed yet" />
        <StatTile icon={MailX} label="Opted out" value={counts ? counts.unsubscribed : '–'} hint="Asked to stop" />
        <StatTile icon={Send} label="Sent today" value={overview ? `${overview.settings.sentToday} / ${overview.settings.dailyCap}` : '–'} hint="Daily sending limit" />
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented label="Section" value={tab} onChange={setTab} options={tabs} />
      </div>

      {tab === 'subscribers' && <SubscribersTab onChanged={loadOverview} />}
      {tab === 'send' && <SendTab overview={overview} onSettings={loadOverview} goHistory={() => { setTab('history'); loadOverview(); }} />}
      {tab === 'festivals' && <FestivalsTab overview={overview} onSettings={loadOverview} />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
};

export default AdminNewsletter;
