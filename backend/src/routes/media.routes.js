const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { authenticate } = require('../middleware/auth.middleware');
const s3 = require('../config/s3');
const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const allowedExts = /\.(jpeg|jpg|png|gif|webp|mp4|mov|avi)$/i;
const allowedMimes = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|x-msvideo))$/;

const memUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const extOk = allowedExts.test(path.extname(file.originalname));
    const mimeOk = allowedMimes.test(file.mimetype);
    cb(extOk && mimeOk ? null : new Error('File type not allowed'), extOk && mimeOk);
  },
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 200) * 1024 * 1024 },
});

// 10 uploads per minute per IP to prevent DoS
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads. Please wait before uploading again.' },
});

router.post(
  '/upload',
  authenticate,
  uploadLimiter,
  memUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const ext = path.extname(req.file.originalname).toLowerCase();
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/.test(ext);

      let buffer = req.file.buffer;
      let key, contentType;

      if (isImage && ext !== '.gif') {
        buffer = await sharp(buffer)
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        key = `${uuidv4()}.webp`;
        contentType = 'image/webp';
      } else {
        key = `${uuidv4()}${ext}`;
        contentType = req.file.mimetype;
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.LINODE_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const url = `${process.env.LINODE_S3_PUBLIC_URL}/${key}`;
      res.json({ url });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
