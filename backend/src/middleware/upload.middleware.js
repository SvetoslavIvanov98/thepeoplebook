const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const s3 = require('../config/s3');

const useS3 = !!process.env.LINODE_S3_BUCKET;

let storage;
if (useS3) {
  storage = multerS3({
    s3,
    bucket: process.env.LINODE_S3_BUCKET,
    contentType: (_req, file, cb) => cb(null, file.mimetype),
    key: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
} else {
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const fileFilter = (_req, file, cb) => {
  const allowedExts = /\.(jpeg|jpg|png|gif|webp|mp4|mov|avi)$/i;
  const allowedMimes = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|x-msvideo))$/;
  const extOk = allowedExts.test(path.extname(file.originalname));
  const mimeOk = allowedMimes.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 200) * 1024 * 1024 },
});

// Normalise req.file / req.files location so controllers always read file.location
const wrapDiskUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) return next(err);
    if (!useS3) {
      if (req.file) {
        req.file.location = `/uploads/${req.file.filename}`;
      }
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach((f) => { f.location = `/uploads/${f.filename}`; });
        } else {
          // fields() returns an object keyed by field name
          Object.values(req.files).forEach((arr) =>
            arr.forEach((f) => { f.location = `/uploads/${f.filename}`; })
          );
        }
      }
    } else if (process.env.LINODE_S3_PUBLIC_URL) {
      // multer-s3 v3 may not construct `location` correctly for custom S3-compatible
      // endpoints (e.g. Linode Object Storage). Always derive it from the public
      // base URL + the key, matching the pattern used in media.routes.js.
      const baseUrl = process.env.LINODE_S3_PUBLIC_URL.replace(/\/$/, '');
      const normalizeS3 = (f) => {
        if (f && f.key) f.location = `${baseUrl}/${f.key}`;
      };
      if (req.file) normalizeS3(req.file);
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach(normalizeS3);
        } else {
          Object.values(req.files).forEach((arr) => arr.forEach(normalizeS3));
        }
      }
    }
    next();
  });
};

module.exports = {
  single: (field) => wrapDiskUpload(upload.single(field)),
  array: (field, max) => wrapDiskUpload(upload.array(field, max)),
  fields: (fieldDefs) => wrapDiskUpload(upload.fields(fieldDefs)),
};
