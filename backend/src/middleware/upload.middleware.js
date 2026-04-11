const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { s3 } = require('../config/s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const useS3 = !!process.env.LINODE_S3_BUCKET;
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');

const isImage = (mimetype) => /^image\//.test(mimetype);

// Convert an image buffer to WebP. Videos pass through unchanged.
const toWebp = (buf, mimetype) => {
  if (!isImage(mimetype)) return Promise.resolve(buf);
  return sharp(buf).webp({ quality: 82 }).toBuffer();
};

// Always buffer into memory so we can process before storage
const storage = multer.memoryStorage();

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

// After multer buffers the file, convert images to WebP, then persist.
const processFile = async (file) => {
  const img = isImage(file.mimetype);
  const buf = await toWebp(file.buffer, file.mimetype);
  const ext = img ? '.webp' : path.extname(file.originalname).toLowerCase();
  const key = `${uuidv4()}${ext}`;
  const contentType = img ? 'image/webp' : file.mimetype;

  if (useS3) {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.LINODE_S3_BUCKET,
      Key: key,
      Body: buf,
      ContentType: contentType,
      ACL: 'public-read',
    }));
    const baseUrl = (process.env.LINODE_S3_PUBLIC_URL || '').replace(/\/$/, '');
    file.location = baseUrl ? `${baseUrl}/${key}` : key;
  } else {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, key);
    fs.writeFileSync(filepath, buf);
    file.location = `/uploads/${key}`;
  }

  file.key = key;
  file.mimetype = contentType;
  return file;
};

const processAllFiles = async (req) => {
  if (req.file) {
    await processFile(req.file);
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      await Promise.all(req.files.map(processFile));
    } else {
      await Promise.all(
        Object.values(req.files).flatMap((arr) => arr.map(processFile))
      );
    }
  }
};

const wrapUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, async (err) => {
    if (err) return next(err);
    try {
      await processAllFiles(req);
      next();
    } catch (e) {
      next(e);
    }
  });
};

module.exports = {
  single: (field) => wrapUpload(upload.single(field)),
  array: (field, max) => wrapUpload(upload.array(field, max)),
  fields: (fieldDefs) => wrapUpload(upload.fields(fieldDefs)),
};
