import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image, Film, FileSpreadsheet, Archive } from 'lucide-react';

export default function UploadZone({ onFilesSelected }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = ''; // reset so same files can be re-selected if needed
    }
  };

  return (
    <div
      className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      title="Click or drag files here to upload"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div className="upload-zone-icon-wrap">
        <div className="upload-zone-icon-inner">
          <UploadCloud size={28} strokeWidth={2.3} />
        </div>
      </div>

      <div className="upload-zone-content">
        <h3 className="upload-zone-title">
          Drop files to upload, or <span className="upload-browse-highlight">browse computer</span>
        </h3>
        <p className="upload-zone-subtitle">
          Direct cloud storage backed by Google Drive & synced with Google Sheets
        </p>

        {/* Index page inspired file type chips */}
        <div className="upload-zone-types">
          <span className="type-chip chip-red">
            <FileText size={12} />
            <span>PDF</span>
          </span>
          <span className="type-chip chip-green">
            <FileSpreadsheet size={12} />
            <span>Sheets</span>
          </span>
          <span className="type-chip chip-indigo">
            <Image size={12} />
            <span>Images</span>
          </span>
          <span className="type-chip chip-yellow">
            <Film size={12} />
            <span>Videos</span>
          </span>
          <span className="type-chip chip-slate">
            <Archive size={12} />
            <span>Archives</span>
          </span>
        </div>
      </div>
    </div>
  );
}
