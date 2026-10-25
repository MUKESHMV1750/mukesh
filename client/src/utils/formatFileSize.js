/**
 * Format bytes into human readable string
 */
export function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null || bytes === '' || isNaN(Number(bytes))) {
    return '0 B';
  }
  const num = Number(bytes);
  if (num <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date to readable string
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get file extension from name
 */
export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

/**
 * Check if file is previewable by mimeType or file extension
 */
export function isPreviewable(mimeType = '', filename = '') {
  const previewable = [
    'image/', 'video/', 'audio/',
    'application/pdf',
    'text/',
  ];
  if (mimeType && previewable.some((type) => mimeType.startsWith(type))) {
    return true;
  }
  if (filename && typeof filename === 'string') {
    return /\.(jpe?g|png|gif|webp|svg|bmp|ico|mp4|webm|ogg|mp3|wav|pdf|txt|csv|json|md|html|css|js|docx?|xlsx?|pptx?)$/i.test(filename);
  }
  return false;
}

