const mongoose = require('mongoose');

const OriginalFileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    bytes: { type: Number, required: true },
    mimetype: { type: String, required: true },
  },
  { _id: false }
);

const ClientArchiveSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    archivePath: { type: String, required: true },
    totalOriginalBytes: { type: Number, required: true },
    archivedBytes: { type: Number, required: true },
    originalFiles: { type: [OriginalFileSchema], default: [] },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ClientArchiveSchema.virtual('archiveId').get(function () {
  return this._id.toString();
});

ClientArchiveSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
});

ClientArchiveSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
});

module.exports = mongoose.model('ClientArchive', ClientArchiveSchema);
