// backend/src/routes/uploads.js
import express from 'express';
import multer from 'multer';
import { uploadBuffer } from '../services/cloudinaryService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer(); // memory storage

router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file provided' });
    const result = await uploadBuffer(req.file.buffer, { folder: 'fleetz' });
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
