import { useState, useCallback } from 'react'
import { EmojiPalette } from './components/EmojiPalette'
import { TilingCanvas } from './components/TilingCanvas'
import { GroupSelector } from './components/GroupSelector'
import { CellEditor } from './components/CellEditor'
import { emojiToTwemojiUrl } from './data/emoji'
import { WALLPAPER_GROUPS } from './wallpaper/groups'
import type { WallpaperGroup } from './wallpaper/types'
import './App.css'

function App() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(['\u{1F600}'])
  const [group, setGroup] = useState<WallpaperGroup>(WALLPAPER_GROUPS[0])
  const [emojiPos, setEmojiPos] = useState({ u: 0.3, v: 0.2 })

  const activeEmoji = selectedEmojis[0] ?? '\u{1F600}'
  const emojiUrl = emojiToTwemojiUrl(activeEmoji)

  const handlePositionChange = useCallback((u: number, v: number) => {
    setEmojiPos({ u, v })
  }, [])

  return (
    <div className="app">
      <div className="sidebar">
        <h1 className="app-title">Infinite Emoji</h1>
        <GroupSelector selected={group} onSelect={setGroup} />
        <CellEditor
          group={group}
          emojiUrl={emojiUrl}
          emojiU={emojiPos.u}
          emojiV={emojiPos.v}
          onPositionChange={handlePositionChange}
        />
        <EmojiPalette
          selectedEmojis={selectedEmojis}
          onSelectionChange={setSelectedEmojis}
        />
      </div>
      <div className="canvas-area">
        <TilingCanvas
          group={group}
          emojiUrl={emojiUrl}
          emojiU={emojiPos.u}
          emojiV={emojiPos.v}
        />
      </div>
    </div>
  )
}

export default App
