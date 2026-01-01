const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${sizes[i]}`;
};

const percent = (part, total) => {
  if (!total || total === 0) return 0;
  return Number(((part / total) * 100).toFixed(2));
};

module.exports = { formatBytes, percent };
