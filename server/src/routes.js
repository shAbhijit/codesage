import { Router } from 'express';
import mongoose from 'mongoose';
import { Project, Review } from './models.js';
import { runReview } from './review.js';

const MAX_CODE = 60_000;
export const api = Router();

// every lookup is scoped to req.user.sub, so users only ever see their own data (API1)
const own = (req, extra = {}) => ({ owner: req.user.sub, ...extra });
const validId = (id) => mongoose.isValidObjectId(id);

// LLM calls are slow and costly: cap reviews per user per hour (API4)
// ponytail: in-memory, per process; move to Mongo/Redis if you run more than one instance
const REVIEWS_PER_HOUR = Number(process.env.REVIEWS_PER_HOUR || 20);
const recent = new Map();
function rateLimited(userId) {
  const now = Date.now();
  const hits = (recent.get(userId) || []).filter((t) => now - t < 3_600_000);
  if (hits.length >= REVIEWS_PER_HOUR) return true;
  recent.set(userId, [...hits, now]);
  return false;
}

api.get('/projects', async (req, res) => {
  const projects = await Project.find(own(req)).sort('-updatedAt').lean();
  const stats = await Review.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(req.user.sub) } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$project', reviews: { $sum: 1 }, lastScore: { $first: '$score' } } },
  ]);
  const byId = Object.fromEntries(stats.map((s) => [s._id, s]));
  res.json(projects.map((p) => ({ ...p, reviews: byId[p._id]?.reviews ?? 0, lastScore: byId[p._id]?.lastScore ?? null })));
});

api.post('/projects', async (req, res) => {
  const name = req.body?.name;
  if (typeof name !== 'string' || !name.trim() || name.length > 100) return res.status(400).json({ error: 'Name required (max 100 chars)' });
  res.status(201).json(await Project.create(own(req, { name })));
});

api.delete('/projects/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const p = await Project.findOneAndDelete(own(req, { _id: req.params.id }));
  if (!p) return res.status(404).json({ error: 'Not found' });
  await Review.deleteMany({ project: p._id });
  res.status(204).end();
});

api.get('/projects/:id/reviews', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const project = await Project.findOne(own(req, { _id: req.params.id })).lean();
  if (!project) return res.status(404).json({ error: 'Not found' });
  const reviews = await Review.find({ project: project._id }).select('-code -remediatedCode').sort('-createdAt').lean();
  res.json({ project, reviews });
});

api.post('/projects/:id/reviews', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const project = await Project.findOne(own(req, { _id: req.params.id }));
  if (!project) return res.status(404).json({ error: 'Not found' });
  const { code, filename = '', language = '' } = req.body ?? {};
  if (typeof code !== 'string' || !code.trim()) return res.status(400).json({ error: 'Code required' });
  if (code.length > MAX_CODE) return res.status(413).json({ error: `Code too large (max ${MAX_CODE} chars)` });
  if (rateLimited(req.user.sub)) return res.status(429).json({ error: 'Review limit reached, try again later' });
  let result;
  try {
    result = await runReview({ code, filename: String(filename).slice(0, 200), language: String(language).slice(0, 40) });
  } catch (e) {
    console.error('review failed', e);
    return res.status(502).json({ error: `Review failed: ${e.message}` });
  }
  const review = await Review.create(own(req, { project: project._id, code, filename, language, ...result }));
  project.set('updatedAt', new Date());
  await project.save();
  res.status(201).json(review);
});

api.get('/reviews/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const review = await Review.findOne(own(req, { _id: req.params.id })).lean();
  if (!review) return res.status(404).json({ error: 'Not found' });
  res.json(review);
});
