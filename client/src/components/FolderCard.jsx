import React, { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, Edit2, Trash2, FolderInput } from 'lucide-react';

export default function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
  onDropFile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCardClick = (e) => {
    // If clicked on menu button or menu itself, don't open folder
    if (menuRef.current && menuRef.current.contains(e.target)) {
      return;
    }
    onOpen(folder);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const droppedFile = JSON.parse(dataStr);
        if (droppedFile && onDropFile) {
          onDropFile(droppedFile, folder.folder_id, folder.folder_name);
        }
      }
    } catch (err) {
      console.warn('Drag drop error:', err);
    }
  };

  return (
    <div
      className={`folder-card ${menuOpen ? 'menu-active' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      title={isDragOver ? `Drop to move into ${folder.folder_name}` : `Open folder: ${folder.folder_name}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="folder-icon-wrapper">
        <Folder size={20} className="folder-icon-svg" />
      </div>

      <div className="folder-card-meta">
        <span className="folder-card-name" title={folder.folder_name}>
          {folder.folder_name}
        </span>
        <span className="folder-card-type-tag">Folder</span>
      </div>

      {isDragOver && (
        <span className="folder-drop-badge">
          <FolderInput size={12} />
          <span>Drop to Move</span>
        </span>
      )}

      <div
        className={`folder-card-actions ${menuOpen ? 'menu-open' : ''}`}
        ref={menuRef}
        style={{ position: 'relative' }}
      >
        <button
          className="folder-action-trigger"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          aria-label="Folder options"
          title="Folder options"
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div
            className="context-menu"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              zIndex: 100,
            }}
          >
            <button
              className="context-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onRename(folder);
              }}
            >
              <Edit2 size={15} />
              <span>Rename</span>
            </button>
            <div className="context-menu-divider" />
            <button
              className="context-menu-item danger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(folder);
              }}
            >
              <Trash2 size={15} />
              <span>Delete folder</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
