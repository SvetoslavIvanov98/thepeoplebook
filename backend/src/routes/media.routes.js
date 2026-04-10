const router = require('express').Router();
const upload = require('../middleware/upload.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/.test(ext);

    if (isImage && ext !== '.gif') {
      const outputPath = req.file.path.replace(ext, '.webp');
      await sharp(req.file.path).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 80 }).toFile(outputPath);
      fs.unlinkSync(req.file.path);
      const filename = path.basename(outputPath);
      return res.json({ url: `/uploads/${filename}` });
    }

    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
