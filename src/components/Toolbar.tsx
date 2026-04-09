import { useState, useCallback } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  onExportPng: () => void;
  onCopyLink: () => Promise<void>;
}

export function Toolbar({ onExportPng, onCopyLink }: ToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopyLink]);

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={onExportPng} title="Download PNG (1920x1080)">
        PNG
      </button>
      <button className="toolbar-btn" onClick={handleCopy} title="Copy permalink">
        {copied ? 'Copied!' : 'Link'}
      </button>
    </div>
  );
}
