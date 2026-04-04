import { useState, useMemo, useCallback } from 'react'
import {
  emojiGroups,
  emojiToTwemojiUrl,
  GROUP_ICONS,
} from '../data/emoji'
import type { EmojiGroup } from '../data/emoji'
import './EmojiPalette.css'

interface EmojiPaletteProps {
  selectedEmojis: string[]
  onSelectionChange: (emojis: string[]) => void
}

export function EmojiPalette({
  selectedEmojis,
  onSelectionChange,
}: EmojiPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGroupIndex, setActiveGroupIndex] = useState(0)
  const selectedSet = useMemo(() => new Set(selectedEmojis), [selectedEmojis])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return emojiGroups
      .map((group) => ({
        ...group,
        emojis: group.emojis.filter((e) =>
          e.name.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.emojis.length > 0)
  }, [searchQuery])

  const toggleEmoji = useCallback(
    (emoji: string) => {
      const next = new Set(selectedSet)
      if (next.has(emoji)) {
        next.delete(emoji)
      } else {
        next.add(emoji)
      }
      onSelectionChange([...next])
    },
    [selectedSet, onSelectionChange],
  )

  const isSearching = searchQuery.trim().length > 0
  const displayGroups: EmojiGroup[] = isSearching
    ? (filteredGroups ?? [])
    : [emojiGroups[activeGroupIndex]]

  return (
    <div className="emoji-palette">
      <input
        className="emoji-search"
        type="text"
        placeholder="Search emoji..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {!isSearching && (
        <div className="emoji-categories">
          {emojiGroups.map((group, i) => (
            <button
              key={group.slug}
              className={`emoji-category-tab${i === activeGroupIndex ? ' active' : ''}`}
              onClick={() => setActiveGroupIndex(i)}
              title={group.name}
            >
              <img
                src={emojiToTwemojiUrl(GROUP_ICONS[group.name])}
                alt={group.name}
                className="emoji-category-icon"
              />
            </button>
          ))}
        </div>
      )}

      <div className="emoji-grid-container">
        {displayGroups.length === 0 && (
          <div className="emoji-no-results">No emoji found</div>
        )}
        {displayGroups.map((group) => (
          <div key={group.slug}>
            {isSearching && (
              <div className="emoji-group-title">{group.name}</div>
            )}
            <div className="emoji-grid">
              {group.emojis.map((entry) => (
                <button
                  key={entry.slug}
                  className={`emoji-btn${selectedSet.has(entry.emoji) ? ' selected' : ''}`}
                  onClick={() => toggleEmoji(entry.emoji)}
                  title={entry.name}
                >
                  <img
                    src={emojiToTwemojiUrl(entry.emoji)}
                    alt={entry.emoji}
                    className="emoji-img"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
