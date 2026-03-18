const multer = require('multer');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const USE_GCS = !!(process.env.GCS_BUCKET_NAME && process.env.GOOGLE_APPLICATION_CREDENTIALS);

let upload;

if (USE_GCS) {
  const storage = new Storage();
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

  const multerGCS = require('multer')({
    storage: {
      _handleFile(req, file, cb) {
        const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const blob = bucket.file(filename);
        const stream = blob.createWriteStream({ resumable: false, contentType: file.mimetype });
        stream.on('error', cb);
        stream.on('finish', () => {
          file.cloudUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;
          cb(null, { filename, cloudUrl: file.cloudUrl });
        });
        file.stream.pipe(stream);
      },
      _removeFile(req, file, cb) { cb(null); },
    },
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    fileFilter(req, file, cb) {
      const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mov|avi/;
      cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
    },
  });
  upload = multerGCS;
} else {
  // Local disk fallback
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
  });
  upload = multer({
    storage: diskStorage,
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mov|avi/;
      cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
    },
  });
}

module.exports = { upload, USE_GCS };
