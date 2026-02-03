// require('dotenv').config();
// const app = require('./app');
// const { connectDB } = require('./config/db');

// const PORT = process.env.PORT || 5000;

// connectDB()
//   .then(() => {
//     app.listen(PORT, () => {
//       // eslint-disable-next-line no-console
//       console.log(`Server listening on port ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     // eslint-disable-next-line no-console
//     console.error('Failed to connect to MongoDB', err);
//     process.exit(1);
//   });

require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on port ${PORT}`);
    });

    // ✅ مهم للشبكة البطيئة ورفع ملفات
    server.requestTimeout = 120000; // 2 minutes
    server.headersTimeout = 125000; // لازم أكبر من requestTimeout
    server.keepAliveTimeout = 65000;
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });