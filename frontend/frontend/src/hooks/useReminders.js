import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/** Same key the server uses to treat "this day + this title" as one reminder. */
export const reminderKey = (eventDate, title = {}) =>
  `${eventDate}|${(title.en || title.ne || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 80)}`;

const apiMessage = (error, fallback) => error?.response?.data?.message || fallback;

/**
 * The signed-in person's calendar reminders: list, save, remove, send a test.
 * Nothing is loaded for a visitor who is not signed in.
 */
const useReminders = () => {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;

  const [state, setState] = useState({
    list: [],
    loading: false,
    loaded: false,
    emailReady: true,
    email: '',
  });

  const load = useCallback(async () => {
    if (!userId) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { data } = await api.get('/reminders');
      setState({
        list: data.reminders || [],
        loading: false,
        loaded: true,
        emailReady: data.emailReady !== false,
        email: data.email || '',
      });
    } catch {
      setState((s) => ({ ...s, loading: false, loaded: true }));
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      load();
    } else {
      setState({ list: [], loading: false, loaded: false, emailReady: true, email: '' });
    }
  }, [userId, load]);

  const byKey = useMemo(() => {
    const map = new Map();
    state.list.forEach((r) => map.set(reminderKey(r.eventDate, r.title), r));
    return map;
  }, [state.list]);

  const datesWithReminder = useMemo(() => new Set(state.list.map((r) => r.eventDate)), [state.list]);

  const save = useCallback(async (payload) => {
    try {
      const { data } = await api.post('/reminders', payload);
      setState((s) => {
        const rest = s.list.filter((r) => r.id !== data.reminder.id);
        const list = [...rest, data.reminder].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
        return { ...s, list };
      });
      return { ok: true, reminder: data.reminder, updated: !!data.updated, dropped: data.dropped || [] };
    } catch (error) {
      return { ok: false, message: apiMessage(error, 'Could not save the reminder.') };
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      setState((s) => ({ ...s, list: s.list.filter((r) => r.id !== id) }));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: apiMessage(error, 'Could not remove the reminder.') };
    }
  }, []);

  const sendTest = useCallback(async (id) => {
    try {
      const { data } = await api.post(`/reminders/${id}/test`);
      return { ok: true, sentTo: data.sentTo };
    } catch (error) {
      return { ok: false, message: apiMessage(error, 'Could not send the test email.') };
    }
  }, []);

  return { ...state, signedIn: !!userId, byKey, datesWithReminder, load, save, remove, sendTest };
};

export default useReminders;
