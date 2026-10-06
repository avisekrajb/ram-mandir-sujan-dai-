import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

/**
 * Admin -> Booking management: bookings made from the public Events page
 * (filters, search, details, status, payment, cancel with reason, CSV) and the
 * catalogue of bookable services with their prices, capacity and times.
 * Server: /api/temple-bookings/admin/* (needs the "bookings" access area).
 */

const pick = (obj, lang) => (obj ? obj[lang === 'ne' || lang === 'hi' ? 'ne' : 'en'] || obj.en || obj.ne || '' : '');
const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
// Neutral status marks; only "pending" (needs action) takes the brand accent.
const STATUS_CLS = {
  pending: 'border-brand-600 text-brand-700',
  confirmed: 'border-ink text-ink',
  cancelled: 'border-line text-mute',
  completed: 'border-line text-ink-soft',
};
const pad = (n) => String(n).padStart(2, '0');
const stamp = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const useEscape = (fn) => {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') ref.current(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
};

const field = 'mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600';
const btn = 'rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-panel disabled:opacity-50';
const btnPrimary = 'rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50';

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const AdminTempleBookings = () => {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState('bookings');

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="font-serif text-2xl font-semibold text-ink">{t.tb_adminTitle}</h1>
      <div className="mt-4 flex gap-1 border-b border-line">
        {['bookings', 'catalogue'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? 'border-brand-600 text-ink' : 'border-transparent text-mute hover:text-ink'}`}
          >
            {k === 'bookings' ? t.tb_tabBookings : t.tb_tabCatalogue}
          </button>
        ))}
      </div>
      <div className="mt-6">{tab === 'bookings' ? <BookingsTab t={t} lang={lang} /> : <CatalogueTab t={t} lang={lang} />}</div>
    </div>
  );
};

// ---------------------------------------------------------------- bookings
const BookingsTab = ({ t, lang }) => {
  const [filters, setFilters] = useState({ q: '', from: '', to: '', category: '', status: '', payment: '' });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/temple-bookings/admin/bookings', { params });
      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      setError(e.response?.data?.message || t.tb_error);
    } finally {
      setLoading(false);
    }
  }, [params, t.tb_error]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    api.get('/temple-bookings/admin/items').then((r) => setItems(r.data?.data || [])).catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const m = new Map();
    items.forEach((i) => { if (!m.has(i.category)) m.set(i.category, i.categoryLabel); });
    return [...m.entries()];
  }, [items]);

  const exportCsv = async () => {
    try {
      const res = await api.get('/temple-bookings/admin/bookings.csv', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `temple-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(t.tb_error);
    }
  };

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const open = rows.find((r) => r._id === openId);
  const replaceRow = (b) => setRows((rs) => rs.map((r) => (r._id === b._id ? b : r)));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-4 lg:grid-cols-12">
        <label className="col-span-2 text-xs font-medium text-mute lg:col-span-3">
          {t.tb_search}
          <input value={filters.q} onChange={set('q')} className={field} />
        </label>
        <label className="text-xs font-medium text-mute lg:col-span-2">
          {t.tb_from}
          <input type="date" value={filters.from} onChange={set('from')} className={field} />
        </label>
        <label className="text-xs font-medium text-mute lg:col-span-2">
          {t.tb_to}
          <input type="date" value={filters.to} onChange={set('to')} className={field} />
        </label>
        <label className="col-span-2 text-xs font-medium text-mute lg:col-span-2">
          {t.tb_category}
          <select value={filters.category} onChange={set('category')} className={field}>
            <option value="">{t.tb_any}</option>
            {categories.map(([k, l]) => <option key={k} value={k}>{pick(l, lang) || k}</option>)}
          </select>
        </label>
        <div className="col-span-2 grid grid-cols-2 gap-3 lg:col-span-3">
          <label className="text-xs font-medium text-mute">
            {t.tb_status}
            <select value={filters.status} onChange={set('status')} className={field}>
              <option value="">{t.tb_any}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{t[`tb_status_${s}`]}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-mute">
            {t.tb_payment}
            <select value={filters.payment} onChange={set('payment')} className={field}>
              <option value="">{t.tb_any}</option>
              <option value="unpaid">{t.tb_pay_unpaid}</option>
              <option value="paid">{t.tb_pay_paid}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mute">{t.tb_showing} {rows.length} {t.tb_of} {total}</p>
        <div className="flex gap-2">
          <button type="button" onClick={load} className={btn}>{t.tb_refresh}</button>
          <button type="button" onClick={exportCsv} className={btn}>{t.tb_exportCsv}</button>
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Phone: one block per booking */}
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white md:hidden">
        {!loading && rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-mute">{t.tb_none}</li>}
        {rows.map((b) => (
          <li key={b._id}>
            <button type="button" onClick={() => setOpenId(b._id)} className="block w-full px-4 py-3 text-left text-sm hover:bg-panel">
              <span className="flex items-start justify-between gap-3">
                <span className="font-medium text-ink">{b.name}</span>
                <span className="whitespace-nowrap tabular-nums text-ink">{money(b.total)}</span>
              </span>
              <span className="mt-0.5 block text-left text-ink-soft">{pick(b.itemName, lang)}</span>
              <span className="mt-0.5 block text-left text-xs text-mute">{b.date}{b.slot ? ` ${b.slot}` : ''} · {b.reference}</span>
              <span className="mt-2 flex items-center gap-3 text-xs">
                <span className={`whitespace-nowrap rounded border px-2 py-0.5 font-medium ${STATUS_CLS[b.status]}`}>{t[`tb_status_${b.status}`]}</span>
                <span className={b.paymentStatus === 'paid' ? 'text-ink' : 'text-mute'}>{t[`tb_pay_${b.paymentStatus}`]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-panel text-xs uppercase tracking-wide text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">{t.tb_reference}</th>
              <th className="px-4 py-3 font-medium">{t.tb_date}</th>
              <th className="px-4 py-3 font-medium">{t.tb_service}</th>
              <th className="px-4 py-3 font-medium">{t.tb_customer}</th>
              <th className="px-4 py-3 text-right font-medium">{t.tb_amount}</th>
              <th className="px-4 py-3 font-medium">{t.tb_status}</th>
              <th className="px-4 py-3 font-medium">{t.tb_payment}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-mute">{t.tb_none}</td></tr>
            )}
            {rows.map((b) => (
              <tr
                key={b._id}
                tabIndex={0}
                onClick={() => setOpenId(b._id)}
                onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(b._id); }}
                className="cursor-pointer outline-none hover:bg-panel focus-visible:bg-panel"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{b.reference}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink">{b.date}{b.slot ? ` ${b.slot}` : ''}</td>
                <td className="px-4 py-3 text-ink">
                  {pick(b.itemName, lang)}
                  <span className="block text-xs text-mute">{pick(b.categoryLabel, lang)}</span>
                </td>
                <td className="px-4 py-3 text-ink">
                  {b.name}
                  <span className="block text-xs text-mute">{b.phone}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">{money(b.total)}</td>
                <td className="px-4 py-3"><span className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${STATUS_CLS[b.status]}`}>{t[`tb_status_${b.status}`]}</span></td>
                <td className={`whitespace-nowrap px-4 py-3 ${b.paymentStatus === 'paid' ? 'text-ink' : 'text-mute'}`}>{t[`tb_pay_${b.paymentStatus}`]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <BookingDrawer
          booking={open}
          t={t}
          lang={lang}
          onClose={() => setOpenId(null)}
          onChange={replaceRow}
          onDelete={(id) => { setRows((rs) => rs.filter((r) => r._id !== id)); setTotal((n) => n - 1); setOpenId(null); }}
        />
      )}
    </div>
  );
};

const BookingDrawer = ({ booking: b, t, lang, onClose, onChange, onDelete }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [askCancel, setAskCancel] = useState(false);
  const [note, setNote] = useState(b.adminNote || '');
  useEscape(() => { if (askCancel) setAskCancel(false); else onClose(); });
  const actionLabel = (a) => {
    const [kind, val] = String(a).split(':');
    if (kind === 'created') return t.tb_hist_created;
    if (kind === 'status') return `${t.tb_status}: ${t[`tb_status_${val}`] || val}`;
    if (kind === 'payment') return `${t.tb_payment}: ${t[`tb_pay_${val}`] || val}`;
    return a;
  };

  const patch = async (body) => {
    setBusy(true);
    setError('');
    try {
      const res = await api.patch(`/temple-bookings/admin/bookings/${b._id}`, body);
      onChange(res.data.data);
      setAskCancel(false);
      setReason('');
    } catch (e) {
      setError(e.response?.data?.message || t.tb_error);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t.tb_deleteAsk)) return;
    setBusy(true);
    try {
      await api.delete(`/temple-bookings/admin/bookings/${b._id}`);
      onDelete(b._id);
    } catch (e) {
      setError(e.response?.data?.message || t.tb_error);
      setBusy(false);
    }
  };

  const row = (k, v) => (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right text-ink">{v || '-'}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose} role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-mute">{t.tb_reference}</p>
            <h2 className="text-xl font-semibold text-ink">{b.reference}</h2>
          </div>
          <button type="button" onClick={onClose} className={btn}>{t.tb_close}</button>
        </div>

        <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
          {row(t.tb_service, `${pick(b.itemName, lang)} (${pick(b.categoryLabel, lang)})`)}
          {row(t.tb_date, `${b.date}${b.slot ? ` ${b.slot}` : ''}`)}
          {b.quantity > 1 && row(t.tb_quantity, b.quantity)}
          {row(t.tb_amount, money(b.total))}
          {row(t.tb_name, b.name)}
          {row(t.tb_phone, <a href={`tel:${b.phone}`} className="underline">{b.phone}</a>)}
          {row(t.tb_emailShort, b.email)}
          {row(t.tb_notesShort, b.notes)}
          {row(t.tb_status, t[`tb_status_${b.status}`])}
          {row(t.tb_payment, `${t[`tb_pay_${b.paymentStatus}`]}${b.paidAt ? ` (${stamp(b.paidAt).slice(0, 10)})` : ''}`)}
          {b.cancelReason && row(t.tb_cancelReason, b.cancelReason)}
          {row(t.tb_created, stamp(b.createdAt))}
        </dl>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {b.status === 'pending' && <button type="button" disabled={busy} onClick={() => patch({ status: 'confirmed' })} className={btnPrimary}>{t.tb_confirm}</button>}
          {b.status === 'confirmed' && <button type="button" disabled={busy} onClick={() => patch({ status: 'completed' })} className={btnPrimary}>{t.tb_complete}</button>}
          {b.status === 'cancelled' && <button type="button" disabled={busy} onClick={() => patch({ status: 'pending' })} className={btn}>{t.tb_reinstate}</button>}
          {b.paymentStatus === 'unpaid'
            ? <button type="button" disabled={busy} onClick={() => patch({ paymentStatus: 'paid' })} className={btn}>{t.tb_markPaid}</button>
            : <button type="button" disabled={busy} onClick={() => patch({ paymentStatus: 'unpaid' })} className={btn}>{t.tb_markUnpaid}</button>}
          {b.status !== 'cancelled' && <button type="button" disabled={busy} onClick={() => setAskCancel(true)} className={btn}>{t.tb_cancel}</button>}
        </div>

        {askCancel && (
          <div className="mt-4 rounded-lg border border-line p-3">
            <label className="text-sm text-ink-soft">
              {t.tb_cancelReason}
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={field} maxLength={500} />
            </label>
            <button type="button" disabled={busy || !reason.trim()} onClick={() => patch({ status: 'cancelled', cancelReason: reason })} className={`${btnPrimary} mt-2`}>{t.tb_cancel}</button>
          </div>
        )}

        <label className="mt-6 block text-sm text-ink-soft">
          {t.tb_adminNote}
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} maxLength={1000} />
        </label>
        <button type="button" disabled={busy || note === (b.adminNote || '')} onClick={() => patch({ adminNote: note })} className={`${btn} mt-2`}>{t.tb_save}</button>

        {b.history?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-mute">{t.tb_history}</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-soft">
              {b.history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 tabular-nums text-mute">{stamp(h.at)}</span>
                  <span>{actionLabel(h.action)}{h.note ? ` (${h.note})` : ''} <span className="text-mute">{h.by === 'visitor' ? t.tb_hist_visitor : h.by}</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" disabled={busy} onClick={remove} className="mt-8 text-sm text-red-700 underline">{t.tb_delete}</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- catalogue
const EMPTY = {
  key: '', category: '', categoryLabel: { ne: '', en: '' }, name: { ne: '', en: '' }, detail: { ne: '', en: '' },
  price: 0, priceIsPlaceholder: false, perPerson: false, maxQuantity: 1, slots: [], capacity: 0, active: true, order: 100,
};

const CatalogueTab = ({ t, lang }) => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/temple-bookings/admin/items').then((r) => setItems(r.data?.data || [])).catch((e) => setError(e.response?.data?.message || t.tb_error));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (data) => {
    setError('');
    setMsg('');
    const body = { ...data, slots: Array.isArray(data.slots) ? data.slots : String(data.slots || '').split(',') };
    try {
      if (data._id) await api.patch(`/temple-bookings/admin/items/${data._id}`, body);
      else await api.post('/temple-bookings/admin/items', body);
      setEditing(null);
      setMsg(t.tb_saved);
      load();
    } catch (e) {
      setError(e.response?.data?.message || t.tb_error);
    }
  };

  const toggle = (i) => save({ _id: i._id, active: !i.active });

  const remove = async (i) => {
    // The catalogue asks about a service type, not a booking: the shared
    // tb_deleteAsk string talks about deleting a booking, which sent people
    // looking in the wrong place.
    if (!window.confirm(t.tb_deleteItemAsk || `Delete "${pick(i.name, lang) || i.key}" from the catalogue? This cannot be undone.`)) return;
    setError('');
    setMsg('');
    try {
      await api.delete(`/temple-bookings/admin/items/${i._id}`);
      setMsg(t.tb_itemDeleted || 'Service type deleted');
      load();
    } catch (e) {
      setError(e.response?.data?.message || t.tb_error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>{msg && <span className="text-sm text-green-700">{msg}</span>}</div>
        <button type="button" onClick={() => setEditing({ ...EMPTY })} className={btnPrimary}>{t.tb_addItem}</button>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-panel text-xs uppercase tracking-wide text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">{t.tb_category}</th>
              <th className="px-4 py-3 font-medium">{t.tb_service}</th>
              <th className="px-4 py-3 text-right font-medium">{t.tb_price}</th>
              <th className="px-4 py-3 font-medium">{t.tb_capacityShort}</th>
              <th className="px-4 py-3 font-medium">{t.tb_time}</th>
              <th className="px-4 py-3 font-medium">{t.tb_active}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((i) => (
              <tr key={i._id} className={i.active ? '' : 'text-mute'}>
                <td className="px-4 py-3">{pick(i.categoryLabel, lang) || i.category}</td>
                <td className="min-w-[12rem] px-4 py-3">
                  {pick(i.name, lang)}
                  {i.perPerson && <span className="block text-xs text-mute">{t.tb_perPersonLabel}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {money(i.price)}
                  {i.priceIsPlaceholder && <span className="block text-xs font-medium text-amber-700">{t.tb_placeholderPrice}</span>}
                </td>
                <td className="px-4 py-3 tabular-nums">{i.capacity || t.tb_noLimit}</td>
                <td className="px-4 py-3">{i.slots?.length ? i.slots.join(', ') : '-'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={i.active}
                    onClick={() => toggle(i)}
                    className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${i.active ? 'border-ink text-ink' : 'border-line text-mute'}`}
                  >
                    {i.active ? t.tb_active : t.tb_inactive}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button type="button" onClick={() => setEditing({ ...EMPTY, ...i })} className={btn}>{t.tb_edit}</button>
                  <button type="button" onClick={() => remove(i)} className="ml-3 text-sm text-red-700 underline">{t.tb_delete}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ItemForm item={editing} t={t} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
};

const ItemForm = ({ item, t, onCancel, onSave }) => {
  const [d, setD] = useState({ ...item, slots: (item.slots || []).join(', ') });
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setL = (k, l) => (e) => setD((x) => ({ ...x, [k]: { ...x[k], [l]: e.target.value } }));
  const lab = 'text-xs font-medium text-mute';
  useEscape(onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onClick={onCancel}>
      <form
        className="my-8 w-full max-w-2xl rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSave(d); }}
      >
        <h2 className="text-lg font-semibold text-ink">{item._id ? t.tb_edit : t.tb_addItem}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={lab}>{t.tb_nameNe}<input value={d.name.ne} onChange={setL('name', 'ne')} className={field} /></label>
          <label className={lab}>{t.tb_nameEn}<input value={d.name.en} onChange={setL('name', 'en')} className={field} /></label>
          <label className={lab}>{t.tb_detailNe}<input value={d.detail?.ne || ''} onChange={setL('detail', 'ne')} className={field} /></label>
          <label className={lab}>{t.tb_detailEn}<input value={d.detail?.en || ''} onChange={setL('detail', 'en')} className={field} /></label>
          <label className={lab}>{t.tb_categoryKey}<input value={d.category} onChange={set('category')} placeholder="puja" className={field} required /></label>
          <label className={lab}>{t.tb_key}<input value={d.key} onChange={set('key')} placeholder="my-puja" className={field} required /></label>
          <label className={lab}>{t.tb_categoryNe}<input value={d.categoryLabel?.ne || ''} onChange={setL('categoryLabel', 'ne')} className={field} /></label>
          <label className={lab}>{t.tb_categoryEn}<input value={d.categoryLabel?.en || ''} onChange={setL('categoryLabel', 'en')} className={field} /></label>
          <label className={lab}>{t.tb_price}<input type="number" min={0} value={d.price} onChange={set('price')} className={field} required /></label>
          <label className={lab}>{t.tb_capacity}<input type="number" min={0} value={d.capacity} onChange={set('capacity')} className={field} /></label>
          <label className={`${lab} sm:col-span-2`}>{t.tb_slots}<input value={d.slots} onChange={set('slots')} placeholder="07:00, 16:00" className={field} /></label>
          <label className={lab}>{t.tb_maxQty}<input type="number" min={1} max={500} value={d.maxQuantity} onChange={set('maxQuantity')} className={field} /></label>
          <label className={lab}>{t.tb_order}<input type="number" value={d.order} onChange={set('order')} className={field} /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm text-ink">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!d.perPerson} onChange={set('perPerson')} />{t.tb_perPersonLabel}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!d.priceIsPlaceholder} onChange={set('priceIsPlaceholder')} />{t.tb_placeholderPrice}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!d.active} onChange={set('active')} />{t.tb_active}</label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btn}>{t.tb_close}</button>
          <button type="submit" className={btnPrimary}>{t.tb_save}</button>
        </div>
      </form>
    </div>
  );
};

export default AdminTempleBookings;
