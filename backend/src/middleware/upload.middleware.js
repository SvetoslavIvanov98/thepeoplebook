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
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
});

// Normalise req.file / req.files location for disk-stored files
// so controllers always read file.location (same as multer-s3)
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
    }
    next();
  });
};

module.exports = {
  single: (field) => wrapDiskUpload(upload.single(field)),
  array: (field, max) => wrapDiskUpload(upload.array(field, max)),
  fields: (fieldDefs) => wrapDiskUpload(upload.fields(fieldDefs)),
};
