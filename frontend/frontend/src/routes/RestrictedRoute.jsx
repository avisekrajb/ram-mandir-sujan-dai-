import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * A time-boxed suspension is not a lock-out: the person is signed in, but may only
 * see the home page (see backend middleware/restricted.js). This sends them there
 * from anywhere else, with the reason spelled out rather than just bouncing them.
 *
 * While the clock is running this also counts down, so the page frees itself the
 * moment the suspension lifts - the person does not have to sign out and back in
 * to find out.
 */
const RestrictedRoute = ({ children }) => {
  const { restricted } = useAuth();
  const location = useLocation();
  // Re-checked on a timer so the guard frees itself the moment a suspension
  // lifts, without the person having to sign out and back in to find out.
  const [, setTick] = React.useState(0);

  // A minute is enough to keep it honest without re-rendering constantly.
  React.useEffect(() => {
    if (!restricted()) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, [restricted]);

  if (!restricted()) return children;
  // Already home: render the page, which shows the banner below.
  if (location.pathname === '/') return children;
  return <Navigate to="/" replace />;
};

/** How much is left, e.g. "4 days", "3 hours", "under a minute". */
export const timeLeft = (until, from = Date.now()) => {
  const ms = new Date(until).getTime() - from;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
};

/** The strip shown at the top of the home page while a suspension is running. */
export const SuspendedBanner = ({ suspendedUntil, t = {} }) => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const left = timeLeft(suspendedUntil, now);
  if (!left) return null;

  return (
    <div className="flex items-start gap-3 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="min-w-0">
        {(t.k7_suspendedNotice || 'Your account is suspended, so only the home page is available. This lifts in about {left}.')
          .replace('{left}', left)}
      </p>
    </div>
  );
};

export default RestrictedRoute;