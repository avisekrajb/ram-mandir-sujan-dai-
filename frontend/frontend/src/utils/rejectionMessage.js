/**
 * Translated text for a message the server's content filter turned away.
 * `field` is the form field it concerns ('name', 'message', 'comment') and
 * `reason` is one of 'rude' | 'link' | 'spam' | 'junk'.
 */
export const rejectionMessage = (t, field, reason) => {
  if (field === 'name') {
    return t[`ct_rejectName_${reason}`] || t.ct_rejectName_junk || 'Please enter your real name.';
  }
  return t[`ct_reject_${reason}`] || t.ct_reject_junk || 'Please write a clear, respectful message.';
};

/** Replace {placeholders} in a translated string. */
export const fillText = (text, vars = {}) =>
  String(text ?? '').replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? vars[key] : match));
