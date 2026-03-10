const { Gallery } = require('../models/mydataschema');
const { makeId, cleanArray } = require('../routes/utils');

function normalizeGallery(payload, id = null) {
  const baseId = id || payload._id || payload.id || makeId('shot');
  return {
    _id: baseId,
    id: baseId,
    url: (payload.url || '').trim(),
    title: (payload.title || 'New look').trim(),
    tags: cleanArray(payload.tags).map((t) => t.toLowerCase()),
    branch: (payload.branch || 'rehab').toLowerCase(),
    stylist: (payload.stylist || 'team').toLowerCase(),
    service: (payload.service || 'styling').toLowerCase(),
  };
}

async function list(req, res) {
  const list = await Gallery.find();
  res.json(list.map((doc) => doc.toJSON()));
}

async function create(req, res) {
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const record = normalizeGallery({ ...req.body, ...(fileUrl ? { url: fileUrl } : {}) });
  if (!record.url) return res.status(400).json({ error: 'Image file or URL is required' });
  const saved = await Gallery.create(record);
  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Gallery.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const mergedBody = { ...existing.toObject(), ...req.body };
  if (fileUrl) mergedBody.url = fileUrl;
  const normalized = normalizeGallery(mergedBody, id);
  if (!normalized.url) return res.status(400).json({ error: 'Image file or URL is required' });
  existing.set(normalized);
  await existing.save();
  res.json(existing.toJSON());
}

async function remove(req, res) {
  const id = req.params.id;
  const deleted = await Gallery.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
}

module.exports = { list, create, update, remove };
