import { WALLPAPER_GROUPS } from '../wallpaper/groups';
import type { WallpaperGroup } from '../wallpaper/types';
import './GroupSelector.css';

interface GroupSelectorProps {
  selected: WallpaperGroup;
  onSelect: (group: WallpaperGroup) => void;
}

export function GroupSelector({ selected, onSelect }: GroupSelectorProps) {
  return (
    <div className="group-selector">
      <div className="group-selector-label">Wallpaper Group</div>
      <div className="group-selector-grid">
        {WALLPAPER_GROUPS.map((g) => (
          <button
            key={g.name}
            className={`group-btn${g.name === selected.name ? ' active' : ''}`}
            onClick={() => onSelect(g)}
            title={`${g.name} (${g.ops.length} symmetries)`}
          >
            {g.name}
          </button>
        ))}
      </div>
    </div>
  );
}
