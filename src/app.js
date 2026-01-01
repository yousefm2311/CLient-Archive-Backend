require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const archiveRoutes = require('./routes/archive.routes');
const errorHandler = require('./middlewares/error.middleware');
const { logger } = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: '*',
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.use('/api/archives', archiveRoutes);

app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
});

app.use(errorHandler);

module.exports = app;
