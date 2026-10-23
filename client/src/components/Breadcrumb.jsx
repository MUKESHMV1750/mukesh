import React from 'react';
import { ChevronRight, HardDrive, Folder } from 'lucide-react';

export default function Breadcrumb({ items = [], onNavigate, onDropFile }) {
  const [dragOverId, setDragOverId] = React.useState(null);

  const makeDropHandlers = (targetFolderId, targetFolderName) => ({
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    },
    onDragEnter: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverId(targetFolderId || 'root');
    },
    onDragLeave: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverId(null);
    },
    onDrop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverId(null);
      try {
        const dataStr = e.dataTransfer.getData('application/json');
        if (dataStr && onDropFile) {
          const droppedFile = JSON.parse(dataStr);
          onDropFile(droppedFile, targetFolderId || '', targetFolderName);
        }
      } catch (err) {
        console.warn('Breadcrumb drop error:', err);
      }
    },
  });

  return (
    <nav className="breadcrumb" aria-label="Folder Navigation">
      <div
        className={`breadcrumb-item ${dragOverId === 'root' ? 'drag-over' : ''}`}
        onClick={() => onNavigate(null)}
        role="button"
        tabIndex={0}
        title="Go to My Drive"
        {...(onDropFile ? makeDropHandlers('', 'My Drive') : {})}
      >
        <HardDrive size={15} />
        <span>My Drive</span>
      </div>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id || index}>
            <span className="breadcrumb-separator">
              <ChevronRight size={13} strokeWidth={2.5} />
            </span>
            {isLast ? (
              <span className="breadcrumb-current">
                <Folder size={15} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: '#f59e0b' }} />
                <span>{item.name}</span>
              </span>
            ) : (
              <div
                className={`breadcrumb-item ${dragOverId === item.id ? 'drag-over' : ''}`}
                onClick={() => onNavigate(item.id)}
                role="button"
                tabIndex={0}
                {...(onDropFile ? makeDropHandlers(item.id, item.name) : {})}
              >
                <span>{item.name}</span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
