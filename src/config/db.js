const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/client_archiver';

  if (!uri) {
    throw new Error('MONGO_URI is not defined');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });

  isConnected = true;
  return mongoose.connection;
};

module.exports = { connectDB };
