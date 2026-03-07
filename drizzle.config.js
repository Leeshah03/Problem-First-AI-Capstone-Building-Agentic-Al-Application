import dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './server/db/schema.js',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/sift',
  },
};
