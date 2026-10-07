// Verifies the uploaded offline music: the limits, that delete really removes it,
// and that nothing else on the page is disturbed.
const fs = require('fs');
const BE = 'D:/RamMandirFinaltodayy/RamMandirFinal/backend/backend/src';

let ok = true;
const check = (label, cond) => {
  if (!cond) ok = false;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
};
const read = (p) => fs.readFileSync(p, 'utf8');

console.log('1. limits: 3 minutes, 10 MB, MP3 only');
const up = read(`${BE}/middleware/upload.js`);
check('server cap is 10 MB', /OFFLINE_MUSIC_MAX_BYTES = 10 \* 1024 \* 1024/.test(up));
check('multer enforces that cap', /fileSize: OFFLINE_MUSIC_MAX_BYTES/.test(up));
check('only MP3 is accepted',
  /file\.mimetype === 'audio\/mpeg' \|\| file\.mimetype === 'audio\/mp3'/.test(up)
  && /allowed_formats: \['mp3'\]/.test(up));
check('its own folder, so it is easy to find and remove',
  /folder: 'temple\/offline-music'/.test(up));
check('Cloudinary clips at 180s, so the stored file cannot outlast the claim',
  /duration: 180/.test(up));

const admin = read('src/components/admin/AdminOfflineNotice.jsx');
check('browser cap is 180 seconds', /MAX_SECONDS = 180/.test(admin));
check('browser cap is 10 MB', /MAX_BYTES = 10 \* 1024 \* 1024/.test(admin));
check('length is measured before uploading, not after',
  /probe\.onloadedmetadata/.test(admin) && /probe\.preload = 'metadata'/.test(admin));

console.log('\n2. super-admin only, both methods');
const routes = read(`${BE}/routes/adminRoutes.js`);
check('upload is super-admin only', /post\('\/offline\/music', requireSuperAdmin/.test(routes));
check('delete is super-admin only', /delete\('\/offline\/music', requireSuperAdmin/.test(routes));

console.log('\n3. delete really removes it');
const ctrl = read(`${BE}/controllers/adminController.js`);
const del = ctrl.slice(ctrl.indexOf('exports.deleteOfflineMusic'));
check('destroys the file on Cloudinary', /destroyCloudinary\(url, 'video'\)/.test(del));
check('clears every field of the track, not just the url',
  /track = \{ url: null, name: '', duration: 0, bytes: 0, uploadedAt: null \}/.test(del));
check('saves the cleared settings', /await settings\.save\(\)/.test(del));
// The ordering matters: clear the pointer first, so a failed CDN delete cannot
// leave the site pointing at a file that may no longer exist.
const clearAt = del.indexOf('track = { url: null');
const saveAt = del.indexOf('await settings.save()');
const destroyAt = del.indexOf('destroyCloudinary(url');
check('pointer is cleared BEFORE the file is destroyed', clearAt < destroyAt && saveAt < destroyAt);

console.log('\n4. delete touches nothing else');
check('does not reset enabled / volume / repeat / wording',
  !/offlineNotice\.(enabled|volume|repeat|interval)/.test(del));
check('does not touch the title/message/backOnline wording',
  !/offlineNotice\.(title|message|backOnline)/.test(del));

console.log('\n5. upload replaces rather than piles up');
const upCtl = ctrl.slice(ctrl.indexOf('exports.uploadOfflineMusic'), ctrl.indexOf('exports.deleteOfflineMusic'));
check('the previous file is destroyed on replacement', /destroyCloudinary\(previousUrl, 'video'\)/.test(upCtl));
check('and the pointer is cleared first', upCtl.indexOf('track.url = null') < upCtl.indexOf('destroyCloudinary(previousUrl'));
check('the measured duration is sent along', /req\.body\?\.duration/.test(upCtl));
check('a duration the browser did not send is stored as 0, not invented', /: 0;/.test(upCtl));

console.log('\n6. the site plays what was uploaded');
const sound = read('src/utils/offlineSound.js');
check('an upload choice uses the uploaded file', /sound === 'upload' && !trackUrl/.test(sound));
check('falls back to the bell if the file has gone',
  /if \(sound === 'upload' && !trackUrl\) return playSynthesised/.test(sound));
check('the uploaded track repeats while offline', /el\.currentTime = 0/.test(sound));
check('nothing is synthesised for an upload (no needless Web Audio)',
  /return sound === 'upload'/.test(sound));
check('both paths return a stop function', (sound.match(/return \(\) => \{\};/g) || []).length >= 2);
const notice = read('src/components/common/OfflineNotice.jsx');
check('the notice passes the uploaded url through', /trackUrl/.test(notice));

console.log('\n7. the admin can hear it before saving');
check('the saved track can be auditioned', /toggleTrackAudio/.test(admin));
check('the chosen-but-not-uploaded file can be auditioned', /preload="metadata"/.test(admin));
check('a new file stops whatever was playing', /stopAudition\(\);\n    setMeasured\(null\);/.test(admin));
check('delete asks for confirmation that says permanently',
  /permanently/.test(admin) && /cannot be brought back|back/.test(admin));
check('and falls back to the bell after deleting', /f\.sound === 'upload' \? \{ \.\.\.f, sound: 'temple' \}/.test(admin));

console.log('\n8. the model holds the track');
const model = read(`${BE}/models/AdminSettings.js`);
const block = model.slice(model.indexOf('offlineNotice: {'));
check('url defaults to empty, so no stale pointer ships', /url: \{ type: String, default: '' \}/.test(block));
check('duration defaults to 0', /duration: \{ type: Number, default: 0 \}/.test(block));
check('bytes defaults to 0', /bytes: \{ type: Number, default: 0 \}/.test(block));
check('uploadedAt defaults to null', /uploadedAt: \{ type: Date, default: null \}/.test(block));

console.log('\n9. "upload" is offered in the choices');
check('the choice list includes an upload option', /value: 'upload'/.test(admin));
check('and it sits above the synthesised ones',
  admin.indexOf("value: 'upload'") < admin.indexOf("value: 'temple'"));

console.log(ok ? '\nall checks passed' : '\nPROBLEM FOUND');
process.exit(ok ? 0 : 1);