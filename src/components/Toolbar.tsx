import { useState, useCallback } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  onExportPng: () => void;
  onExportCell: () => void;
  onShare: () => Promise<void>;
}

export function Toolbar({ onExportPng, onExportCell, onShare }: ToolbarProps) {
  const [shared, setShared] = useState(false);

  const handleShare = useCallback(async () => {
    await onShare();
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, [onShare]);

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={onExportPng} title="Download tiling PNG (1920x1080)">
        PNG
      </button>
      <button className="toolbar-btn" onClick={onExportCell} title="Download unit cell PNG">
        Cell
      </button>
      <button className="toolbar-btn" onClick={handleShare} title="Share link">
        {shared ? 'Copied!' : 'Share'}
      </button>
    </div>
  );
}
