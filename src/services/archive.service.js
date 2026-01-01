const mongoose = require('mongoose');
const ClientArchive = require('../models/ClientArchive');

const createArchiveRecord = async ({ archiveId, ...payload }) => {
  const doc = new ClientArchive({
    _id: archiveId,
    ...payload,
  });
  return doc.save();
};

const getArchiveById = async (archiveId) => {
  if (!mongoose.Types.ObjectId.isValid(archiveId)) {
    return null;
  }
  return ClientArchive.findById(archiveId);
};

const listByClient = async (clientId) => {
  return ClientArchive.find({ clientId }).sort({ createdAt: -1 });
};

const deleteArchiveById = async (archiveId) => {
  if (!mongoose.Types.ObjectId.isValid(archiveId)) {
    return null;
  }
  return ClientArchive.findByIdAndDelete(archiveId);
};

module.exports = {
  createArchiveRecord,
  getArchiveById,
  listByClient,
  deleteArchiveById,
};
