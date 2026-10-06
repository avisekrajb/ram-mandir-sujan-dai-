// One password rule for every place a password is set (sign-up, reset, change, admin-created accounts).
//
// Length matters most, so the minimum is 8 characters; on top of that the most common passwords,
// repeated characters, plain keyboard/number runs, and the person's own e-mail name are refused.
// (Forcing symbols and capitals mostly produces "Password1!", so no composition rules.)

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

// The passwords attackers try first (RockYou / Nepali-region favourites), compared in lower case.
const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'pass1234', 'passpass',
  '12345678', '123456789', '1234567890', '123123123', '11111111', '00000000', '12341234', '87654321', '987654321',
  'qwerty123', 'qwertyui', 'qwertyuiop', 'qwerty12', 'asdfghjk', 'asdfghjkl', 'zxcvbnm1', '1q2w3e4r', '1qaz2wsx', 'abcd1234', 'abc12345', 'abcdefgh',
  'iloveyou', 'welcome1', 'welcome123', 'letmein1', 'admin123', 'admin1234', 'administrator', 'superadmin', 'changeme', 'changeme1', 'default1', 'test1234', 'testtest', 'guest123',
  'nepal123', 'nepal1234', 'nepali123', 'kathmandu', 'kathmandu1', 'namaste1', 'namaste123', 'ramchandra', 'ramchandra1', 'ramchandra123', 'shreeram', 'jaishreeram', 'jayshreeram', 'sitaram1', 'sitaram123', 'hanuman123', 'mandir123', 'temple123', 'temple1234',
  'ram12345', 'shiva123', 'om123456', 'krishna123', 'bhagwan1', 'ganesh123', 'radhakrishna',
]);

const isRun = (value) => {
  // 12345678, 87654321, abcdefgh ... a straight ascending or descending run.
  if (value.length < 4) return false;
  let up = true;
  let down = true;
  for (let i = 1; i < value.length; i += 1) {
    const d = value.charCodeAt(i) - value.charCodeAt(i - 1);
    if (d !== 1) up = false;
    if (d !== -1) down = false;
  }
  return up || down;
};

// Returns an error message, or null when the password is acceptable.
const passwordProblem = (password, { email = '', name = '' } = {}) => {
  if (typeof password !== 'string' || !password) return 'Password is required';
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters`;
  if (password.length > MAX_LENGTH) return 'Password is too long';

  const lowered = password.toLowerCase();
  if (COMMON.has(lowered)) return 'That password is too common. Please choose a less predictable one';
  if (/^(.{1,3})\1+$/.test(lowered)) return 'That password is too repetitive. Please choose a less predictable one';
  if (isRun(lowered)) return 'That password is a simple sequence. Please choose a less predictable one';

  const local = String(email).toLowerCase().split('@')[0];
  if (local.length >= 4 && lowered.includes(local)) return 'The password should not contain your e-mail name';
  const first = String(name).toLowerCase().trim().split(/\s+/)[0];
  if (first && first.length >= 5 && lowered === first) return 'The password should not be your name';
  return null;
};

module.exports = { passwordProblem, MIN_LENGTH, MAX_LENGTH };
