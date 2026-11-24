import mongoose from 'mongoose';
import { app } from './app.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');

const port = process.env.PORT || 5050;
await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/codesage');
app.listen(port, () => console.log(`CodeSage API on http://localhost:${port}`));
