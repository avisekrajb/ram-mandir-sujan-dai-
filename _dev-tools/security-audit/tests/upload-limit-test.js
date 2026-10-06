// Exercises the REAL uploadUserImage middleware (multer 2.x + CloudinaryStorage) with Cloudinary's upload
// stubbed out, so the size / type / count limits can be proven without any network or credentials.
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
process.env.JWT_SECRET = 'x'.repeat(32); process.env.NODE_ENV = 'production';
process.env.CLOUDINARY_CLOUD_NAME = ''; process.env.CLOUDINARY_API_KEY = ''; process.env.CLOUDINARY_API_SECRET = '';
const { PassThrough } = require('stream');
const cloudinaryV2 = require(BACKEND + '/node_modules/cloudinary').v2;
let uploads = 0;
cloudinaryV2.uploader.upload_stream = (opts, cb) => {
  const pt = new PassThrough(); let size = 0;
  pt.on('data', (d) => { size += d.length; });
  pt.on('end', () => { uploads += 1; cb(null, { public_id: 'temple/user/stub', secure_url: 'https://res.cloudinary.com/demo/image/upload/stub.png', bytes: size, format: 'png', resource_type: 'image' }); });
  return pt;
};
// multer deletes a half-uploaded file through the storage's _removeFile
cloudinaryV2.uploader.destroy = (id, opts, cb) => cb(null, { result: 'ok' });
const express = require(BACKEND + '/node_modules/express');
const { profilePhotoUpload, paymentScreenshotUpload } = require(BACKEND + '/src/middleware/uploadUserImage');
const { handleMulterError } = require(BACKEND + '/src/middleware/upload');
const app = express();
app.post('/profile', profilePhotoUpload.single('image'), (req, res) => res.json({ ok: true, url: req.file && req.file.path }));
app.post('/shot', paymentScreenshotUpload.single('image'), (req, res) => res.json({ ok: true, url: req.file && req.file.path }));
app.use(handleMulterError);
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const server = app.listen(0, async () => {
  const port = server.address().port;
  const post = async (path, parts) => {
    const fd = new FormData();
    for (const [name, size, type, filename] of parts) fd.append(name, new Blob([Buffer.alloc(size, 7)], { type }), filename);
    const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', body: fd });
    return { status: r.status, text: (await r.text()).slice(0, 100) };
  };
  const MB = 1024 * 1024; let fails = 0;
  const check = (label, ok, got) => { if (!ok) fails += 1; console.log((ok ? 'PASS ' : 'FAIL ') + label + ' -> ' + got.status + ' ' + got.text); };
  let r;
  r = await post('/profile', [['image', 4 * MB, 'image/png', 'a.png']]);        check('4 MB png as profile photo is accepted', r.status === 200 && /cloudinary/.test(r.text), r);
  r = await post('/profile', [['image', 6 * MB, 'image/png', 'a.png']]);        check('6 MB png as profile photo is refused (limit 5 MB)', r.status === 400, r);
  r = await post('/shot', [['image', 9 * MB, 'image/jpeg', 'a.jpg']]);          check('9 MB jpeg as payment screenshot is accepted', r.status === 200, r);
  r = await post('/shot', [['image', 11 * MB, 'image/jpeg', 'a.jpg']]);         check('11 MB jpeg as payment screenshot is refused (limit 10 MB)', r.status === 400, r);
  r = await post('/profile', [['image', 1000, 'video/mp4', 'a.mp4']]);          check('video refused', r.status === 400, r);
  r = await post('/profile', [['image', 1000, 'image/svg+xml', 'a.svg']]);      check('svg refused', r.status === 400, r);
  r = await post('/profile', [['image', 1000, 'image/gif', 'a.gif']]);          check('gif refused', r.status === 400, r);
  r = await post('/profile', [['image', 1000, 'image/png', 'a.png'], ['image', 1000, 'image/png', 'b.png']]); check('two files refused', r.status === 400, r);
  r = await post('/profile', [['other', 1000, 'image/png', 'a.png']]);          check('unexpected field name refused', r.status === 400, r);
  console.log(fails ? `\n${fails} FAILED` : '\nall upload limit checks passed');
  server.close(); process.exit(fails ? 1 : 0);
});
