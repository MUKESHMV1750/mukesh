import {
  FileText, Image, Film, Music, Archive,
  Code, Database, File, FileSpreadsheet,
  Presentation, FileType
} from 'lucide-react';

const iconMap = {
  // Documents
  pdf: { icon: FileText, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  doc: { icon: FileText, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  docx: { icon: FileText, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  txt: { icon: FileText, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
  rtf: { icon: FileText, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
  odt: { icon: FileText, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },

  // Spreadsheets
  xls: { icon: FileSpreadsheet, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  xlsx: { icon: FileSpreadsheet, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  csv: { icon: FileSpreadsheet, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  ods: { icon: FileSpreadsheet, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },

  // Presentations
  ppt: { icon: Presentation, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  pptx: { icon: Presentation, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  odp: { icon: Presentation, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },

  // Images
  jpg: { icon: Image, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  jpeg: { icon: Image, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  png: { icon: Image, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  gif: { icon: Image, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  svg: { icon: Image, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  webp: { icon: Image, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  bmp: { icon: Image, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },

  // Videos
  mp4: { icon: Film, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  mov: { icon: Film, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  mkv: { icon: Film, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  webm: { icon: Film, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },

  // Audio
  mp3: { icon: Music, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  wav: { icon: Music, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  aac: { icon: Music, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  ogg: { icon: Music, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  flac: { icon: Music, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },

  // Archives
  zip: { icon: Archive, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
  rar: { icon: Archive, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
  '7z': { icon: Archive, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
  tar: { icon: Archive, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
  gz: { icon: Archive, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },

  // Code
  html: { icon: Code, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  css: { icon: Code, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  js: { icon: Code, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  php: { icon: Code, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  py: { icon: Code, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  java: { icon: Code, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  sql: { icon: Database, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },

  // Data
  json: { icon: Database, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  xml: { icon: Database, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  yaml: { icon: Database, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  log: { icon: FileType, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
};

const defaultIcon = { icon: File, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' };

export function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return iconMap[ext] || defaultIcon;
}

export function getFileIconByMime(mimeType) {
  if (mimeType.startsWith('image/')) return iconMap.jpg;
  if (mimeType.startsWith('video/')) return iconMap.mp4;
  if (mimeType.startsWith('audio/')) return iconMap.mp3;
  if (mimeType.includes('pdf')) return iconMap.pdf;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return iconMap.xlsx;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return iconMap.pptx;
  if (mimeType.includes('document') || mimeType.includes('word')) return iconMap.docx;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return iconMap.zip;
  if (mimeType.startsWith('text/')) return iconMap.txt;
  return defaultIcon;
}
