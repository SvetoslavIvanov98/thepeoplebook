const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const s3 = require('../config/s3');

const storage = multerS3({
  s3,
  bucket: process.env.LINODE_S3_BUCKET,
  contentType: (_req, file, cb) => cb(null, file.mimetype),
  key: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

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

module.exports = upload;
