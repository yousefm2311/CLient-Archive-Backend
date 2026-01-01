process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/client_archiver_test';
process.env.UPLOAD_TEMP_DIR = 'uploads/test-temp';
process.env.UPLOAD_ARCHIVE_DIR = 'uploads/test-archives';
process.env.BASE_URL = 'http://localhost:5000';

const path = require('path');
const fs = require('fs');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const ClientArchive = require('../src/models/ClientArchive');

const tempDir = path.resolve(process.env.UPLOAD_TEMP_DIR);
const archiveDir = path.resolve(process.env.UPLOAD_ARCHIVE_DIR);

beforeAll(async () => {
  await connectDB();
});

afterEach(async () => {
  await ClientArchive.deleteMany({ clientId: 'testclient' });
  await fs.promises.rm(tempDir, { recursive: true, force: true });
  await fs.promises.rm(archiveDir, { recursive: true, force: true });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /api/archives/:clientId/upload', () => {
  it('creates an archive record and returns metadata', async () => {
    const res = await request(app)
      .post('/api/archives/testclient/upload')
      .attach('files', path.join(__dirname, 'fixtures', 'sample.pdf'));

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('clientId', 'testclient');
    expect(res.body).toHaveProperty('archiveId');
    expect(res.body).toHaveProperty('totalOriginalBytes');
    expect(res.body).toHaveProperty('archivedBytes');
    expect(res.body).toHaveProperty('savingsBytes');
    expect(res.body).toHaveProperty('savingsPercent');
    expect(res.body).toHaveProperty('archiveDownloadUrl');
    expect(res.body).toHaveProperty('fileCount', 1);
  }, 20000);
});
