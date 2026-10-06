// Names of the account actions the server writes to the audit log, with the
// i18n key for each. Anything else (content edits written by older pages)
// is shown as stored.
const ACTION_KEYS = {
  'Account Created': ['k7_actAccountCreated', 'Account Created'],
  'Admin Created': ['k7_actAdminCreated', 'Admin Created'],
  'Account Updated': ['k7_actAccountUpdated', 'Account Updated'],
  'Account Suspended': ['k7_actAccountSuspended', 'Account Suspended'],
  'Account Reactivated': ['k7_actAccountReactivated', 'Account Reactivated'],
  'Password Reset': ['k7_actPasswordReset', 'Password Reset'],
  'Sessions Revoked': ['k7_actSessionsRevoked', 'Sessions Revoked'],
  'Admin Access Granted': ['k7_actAdminGranted', 'Admin Access Granted'],
  'Admin Access Removed': ['k7_actAdminRemoved', 'Admin Access Removed'],
  'Admin Access Updated': ['k7_actAccessUpdated', 'Admin Access Updated'],
  'Account Deleted': ['k7_actAccountDeleted', 'Account Deleted'],
  'Bulk Delete': ['k7_actBulkDelete', 'Bulk Delete'],
  'Bulk Suspend': ['k7_actBulkSuspend', 'Bulk Suspend'],
  'Bulk Reactivate': ['k7_actBulkReactivate', 'Bulk Reactivate'],
};

export const actionLabel = (action, t = {}) => {
  const entry = ACTION_KEYS[action];
  return entry ? (t[entry[0]] || entry[1]) : action;
};
