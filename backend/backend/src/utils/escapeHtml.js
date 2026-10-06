// Escapes text before it is placed inside an HTML e-mail or page, so a name or message typed by a
// visitor can never become markup (links, forms, images) in a message sent from the temple's address.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

module.exports = escapeHtml;
