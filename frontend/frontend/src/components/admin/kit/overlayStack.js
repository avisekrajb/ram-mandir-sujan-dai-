// Who is on top? Dialogs, drawers, the search palette and row menus can be open
// at the same time (a confirm inside a drawer, a menu inside a table). Escape
// and the Tab trap belong to the top one only, and the page-scroll lock is
// counted so closing two overlays in the same moment can never leave the
// public site unable to scroll.
let nextId = 1;
const stack = [];
let savedOverflow = null;
const handled = new WeakSet();

const syncLock = () => {
  if (typeof document === 'undefined') return;
  const wantLock = stack.some((o) => o.lock);
  if (wantLock && savedOverflow === null) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (!wantLock && savedOverflow !== null) {
    document.body.style.overflow = savedOverflow;
    savedOverflow = null;
  }
};

/** Register an open overlay. Returns its id. `lock: false` for menus that should not freeze the page. */
export const pushOverlay = ({ lock = true } = {}) => {
  const id = nextId++;
  stack.push({ id, lock });
  syncLock();
  return id;
};

export const popOverlay = (id) => {
  const i = stack.findIndex((o) => o.id === id);
  if (i !== -1) stack.splice(i, 1);
  syncLock();
};

export const isTopOverlay = (id) => stack.length > 0 && stack[stack.length - 1].id === id;

/**
 * True when this keydown is an Escape that overlay `id` should act on: it is the
 * top overlay and no other overlay has already acted on the same event.
 */
export const claimEscape = (e, id) => {
  if (e.key !== 'Escape' || handled.has(e) || !isTopOverlay(id)) return false;
  handled.add(e);
  return true;
};
