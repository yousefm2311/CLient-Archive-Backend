const morgan = require('morgan');

const logger =
  process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : morgan('combined');

module.exports = { logger };
