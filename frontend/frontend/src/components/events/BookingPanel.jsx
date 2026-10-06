import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

/**
 * Public booking on the Events page: pick a service (grouped by category, with
 * its price), a date and time, send name and phone; the server returns a
 * reference number. Prices, capacity and times come from Admin -> Booking
 * management. Payment is taken at the temple office.
 */

const pick = (obj, lang) => (obj ? obj[lang === 'ne' || lang === 'hi' ? 'ne' : 'en'] || obj.en || obj.ne || '' : '');
const toDev = (s) => String(s).replace(/[0-9]/g, (d) => '०१२३४५६७८९'[d]);

const BookingPanel = () => {
  const { t, lang } = useLanguage();
  const dev = lang === 'ne' || lang === 'hi';
  const num = (v) => (dev ? toDev(v) : String(v));
  const money = (n) => `${dev ? 'रू.' : 'Rs.'} ${num(Number(n).toLocaleString('en-IN'))}`;

  const [items, setItems] = useState([]);
  const [today, setToday] = useState('');
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ date: '', slot: '', quantity: 1, name: '', phone: '', email: '', notes: '', hp_field: '' });
  const [avail, setAvail] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [lookup, setLookup] = useState({ ref: '', phone: '' });
  const [lookupResult, setLookupResult] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    api.get('/temple-bookings/items')
      .then((res) => {
        setItems(res.data?.data || []);
        setToday(res.data?.today || new Date().toISOString().slice(0, 10));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const seen = new Map();
    items.forEach((i) => { if (!seen.has(i.category)) seen.set(i.category, i.categoryLabel); });
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
  }, [items]);

  const visible = cat === 'all' ? items : items.filter((i) => i.category === cat);
  const grouped = useMemo(() => {
    const out = [];
    visible.forEach((i) => {
      let g = out.find((x) => x.key === i.category);
      if (!g) { g = { key: i.category, label: i.categoryLabel, rows: [] }; out.push(g); }
      g.rows.push(i);
    });
    return out;
  }, [visible]);

  const item = items.find((i) => i._id === selectedId);

  // availability for the chosen item and date
  useEffect(() => {
    setAvail(null);
    if (!item || !form.date || !item.capacity) return;
    api.get('/temple-bookings/availability', { params: { item: item._id, date: form.date } })
      .then((res) => setAvail(res.data?.data || null))
      .catch(() => setAvail(null));
  }, [item, form.date]);

  const remainingFor = (slot) => {
    if (!avail) return null;
    const row = avail.find((a) => a.slot === (slot || ''));
    return row ? row.remaining : null;
  };

  const choose = (id) => {
    setSelectedId(id);
    setError('');
    setForm((f) => ({ ...f, slot: '', quantity: 1 }));
    // bring the form into view when its top is off screen (always on phones)
    setTimeout(() => {
      const el = formRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (window.innerWidth < 1024 || top < 80 || top > window.innerHeight * 0.6) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const qty = item?.perPerson ? Math.max(1, Math.min(item.maxQuantity || 1, Number(form.quantity) || 1)) : 1;
  const total = item ? (item.perPerson ? item.price * qty : item.price) : 0;
  const slotFull = item?.capacity && remainingFor(form.slot) === 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!item) return;
    setSending(true);
    setError('');
    try {
      const res = await api.post('/temple-bookings', {
        item: item._id, date: form.date, slot: form.slot, quantity: qty, name: form.name,
        phone: form.phone, email: form.email, notes: form.notes, hp_field: form.hp_field,
      });
      setDone(res.data?.data);
      setForm({ date: '', slot: '', quantity: 1, name: '', phone: '', email: '', notes: '', hp_field: '' });
      setSelectedId('');
    } catch (err) {
      setError(err.response?.data?.message || t.tb_error);
    } finally {
      setSending(false);
    }
  };

  const doLookup = async (e) => {
    e.preventDefault();
    try {
      const res = await api.get('/temple-bookings/lookup', { params: { ref: lookup.ref.trim(), phone: lookup.phone.trim() } });
      setLookupResult({ ok: true, data: res.data?.data });
    } catch (err) {
      setLookupResult({ ok: false, message: err.response?.data?.message || t.tb_error });
    }
  };

  const input = 'mt-1.5 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink outline-none transition-colors focus:border-brand-600 focus:ring-1 focus:ring-brand-600';
  const label = 'block text-sm font-medium text-ink-soft';
  const maxDate = today ? new Date(new Date(`${today}T00:00:00Z`).getTime() + 365 * 864e5).toISOString().slice(0, 10) : '';

  if (loading) return null;

  return (
    <section id="booking" className="w-full border-t border-line bg-panel">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{t.tb_sectionLabel}</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold text-ink sm:text-4xl">{t.tb_title}</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-soft sm:text-lg">{t.tb_intro}</p>

        {items.length === 0 ? (
          <p className="mt-10 rounded-xl border border-line bg-white p-6 text-ink-soft">{t.tb_noItems}</p>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* Catalogue */}
            <div className="min-w-0">
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-1 border-b border-line" role="tablist">
                  {[{ key: 'all', label: null }, ...categories].map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      role="tab"
                      aria-selected={cat === c.key}
                      onClick={() => setCat(c.key)}
                      className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:text-base ${
                        cat === c.key ? 'border-brand-600 text-ink' : 'border-transparent text-mute hover:text-ink'
                      }`}
                    >
                      {c.label ? pick(c.label, lang) : t.tb_all}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-8">
                {grouped.map((g) => (
                  <div key={g.key}>
                    {cat === 'all' && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-mute">{pick(g.label, lang)}</h3>}
                    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                      {g.rows.map((i) => {
                        const active = i._id === selectedId;
                        return (
                          <li key={i._id}>
                            <button
                              type="button"
                              onClick={() => choose(i._id)}
                              aria-pressed={active}
                              className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors sm:px-5 ${active ? 'bg-brand-50' : 'hover:bg-panel'}`}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-base font-medium text-ink">{pick(i.name, lang)}</span>
                                {pick(i.detail, lang) && <span className="block text-sm text-mute">{pick(i.detail, lang)}</span>}
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block text-base font-semibold tabular-nums text-ink">{money(i.price)}</span>
                                {i.perPerson && <span className="block text-xs text-mute">{t.tb_perPerson}</span>}
                              </span>
                              <span className={`hidden w-20 shrink-0 text-right text-sm font-medium sm:block ${active ? 'text-brand-600' : 'text-mute'}`}>
                                {active ? t.tb_selected : t.tb_choose}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div ref={formRef} className="scroll-mt-28">
              <div className="rounded-xl border border-line bg-white p-5 sm:p-6">
                {done ? (
                  <div>
                    <h3 className="font-serif text-2xl font-semibold text-ink">{t.tb_doneTitle}</h3>
                    <p className="mt-2 text-ink-soft">{t.tb_doneText}</p>
                    <dl className="mt-5 space-y-2 rounded-lg bg-panel p-4 text-base">
                      <div className="flex justify-between gap-4"><dt className="text-mute">{t.tb_reference}</dt><dd className="font-semibold tracking-wide text-ink">{done.reference}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-mute">{t.tb_service}</dt><dd className="text-right text-ink">{pick(done.itemName, lang)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-mute">{t.tb_date}</dt><dd className="text-ink">{num(done.date)}{done.slot ? `, ${num(done.slot)}` : ''}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-mute">{t.tb_total}</dt><dd className="font-semibold text-ink">{money(done.total)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-mute">{t.tb_status}</dt><dd className="text-ink">{t.tb_status_pending}</dd></div>
                    </dl>
                    <button type="button" onClick={() => setDone(null)} className="mt-5 w-full rounded-lg border border-line px-4 py-2.5 font-medium text-ink hover:bg-panel">
                      {t.tb_another}
                    </button>
                  </div>
                ) : !item ? (
                  <p className="py-6 text-center text-ink-soft">{t.tb_pickFirst}</p>
                ) : (
                  <form onSubmit={submit} noValidate={false}>
                    <p className="text-sm text-mute">{pick(item.categoryLabel, lang)}</p>
                    <h3 className="font-serif text-xl font-semibold text-ink">{pick(item.name, lang)}</h3>

                    <div className="mt-5 grid gap-4">
                      <div>
                        <label className={label} htmlFor="tb-date">{t.tb_date}</label>
                        <input id="tb-date" type="date" required min={today} max={maxDate} value={form.date} onChange={set('date')} className={input} />
                        {form.date && item.capacity > 0 && !item.slots.length && remainingFor('') !== null && (
                          <p className={`mt-1 text-sm ${remainingFor('') === 0 ? 'text-brand-600' : 'text-mute'}`}>
                            {remainingFor('') === 0 ? t.tb_full : `${num(remainingFor(''))} ${t.tb_left}`}
                          </p>
                        )}
                      </div>

                      {item.slots.length > 0 && (
                        <div>
                          <span className={label}>{t.tb_time}</span>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {item.slots.map((s) => {
                              const left = remainingFor(s);
                              const full = left === 0;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={full}
                                  onClick={() => setForm((f) => ({ ...f, slot: s }))}
                                  className={`rounded-lg border px-3 py-2 text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                    form.slot === s ? 'border-brand-600 bg-brand-50 text-ink' : 'border-line text-ink-soft hover:border-gray-400'
                                  }`}
                                >
                                  {num(s)}{full ? ` · ${t.tb_full}` : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {item.perPerson && (
                        <div>
                          <label className={label} htmlFor="tb-qty">{t.tb_quantity}</label>
                          <input id="tb-qty" type="number" min={1} max={item.maxQuantity} value={form.quantity} onChange={set('quantity')} className={input} />
                        </div>
                      )}

                      <div>
                        <label className={label} htmlFor="tb-name">{t.tb_name}</label>
                        <input id="tb-name" required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} className={input} />
                      </div>
                      <div>
                        <label className={label} htmlFor="tb-phone">{t.tb_phone}</label>
                        <input id="tb-phone" type="tel" required pattern="[0-9+\-\s()]{7,20}" autoComplete="tel" value={form.phone} onChange={set('phone')} className={input} />
                      </div>
                      <div>
                        <label className={label} htmlFor="tb-email">{t.tb_email}</label>
                        <input id="tb-email" type="email" maxLength={120} autoComplete="email" value={form.email} onChange={set('email')} className={input} />
                      </div>
                      <div>
                        <label className={label} htmlFor="tb-notes">{t.tb_notes}</label>
                        <textarea id="tb-notes" rows={3} maxLength={1000} placeholder={t.tb_notesHint} value={form.notes} onChange={set('notes')} className={input} />
                      </div>
                      <input type="text" tabIndex={-1} autoComplete="off" value={form.hp_field} onChange={set('hp_field')} className="hidden" aria-hidden="true" />
                    </div>

                    <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
                      <span className="text-ink-soft">{t.tb_total}</span>
                      <span className="text-2xl font-semibold tabular-nums text-ink">{money(total)}</span>
                    </div>
                    <p className="mt-1 text-right text-sm text-mute">{t.tb_payAtTemple}</p>

                    {error && <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700" role="alert">{error}</p>}

                    <button
                      type="submit"
                      disabled={sending || slotFull || (item.slots.length > 0 && !form.slot)}
                      className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? t.tb_sending : t.tb_submit}
                    </button>
                  </form>
                )}
              </div>

              {/* Check a booking */}
              <form onSubmit={doLookup} className="mt-6 rounded-xl border border-line bg-white p-5 sm:p-6">
                <h3 className="text-base font-semibold text-ink">{t.tb_checkTitle}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input aria-label={t.tb_reference} placeholder="SRM-000000-XXXXX" value={lookup.ref} onChange={(e) => setLookup((l) => ({ ...l, ref: e.target.value }))} className={input} required />
                  <input aria-label={t.tb_phone} placeholder={t.tb_phone} type="tel" value={lookup.phone} onChange={(e) => setLookup((l) => ({ ...l, phone: e.target.value }))} className={input} required />
                </div>
                <button type="submit" className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-panel">{t.tb_check}</button>
                {lookupResult && (
                  lookupResult.ok ? (
                    <p className="mt-3 text-sm text-ink-soft">
                      <span className="font-medium text-ink">{lookupResult.data.reference}</span> · {pick(lookupResult.data.itemName, lang)} · {num(lookupResult.data.date)} · {t[`tb_status_${lookupResult.data.status}`]} · {t[`tb_pay_${lookupResult.data.paymentStatus}`]}
                      {lookupResult.data.cancelReason ? ` · ${lookupResult.data.cancelReason}` : ''}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-brand-700">{lookupResult.message}</p>
                  )
                )}
              </form>

              <p className="mt-4 text-sm leading-relaxed text-mute">{t.tb_contact}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default BookingPanel;
