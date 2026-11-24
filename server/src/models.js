import mongoose from 'mongoose';
import { OWASP, SEVERITIES } from './owasp.js';

const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true }));

export const Project = model('Project', new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
}, { timestamps: true }));

const Finding = new Schema({
  owaspId: { type: String, enum: Object.keys(OWASP), required: true },
  title: String,
  severity: { type: String, enum: SEVERITIES, required: true },
  lines: [Number],
  explanation: String,
  fix: String,
}, { _id: false });

export const Review = model('Review', new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  filename: String,
  language: String,
  code: { type: String, required: true },
  summary: String,
  remediatedCode: String,
  findings: [Finding],
  score: Number,
  llm: String,
}, { timestamps: true }));
