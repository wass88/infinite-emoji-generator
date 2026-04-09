import { useState } from 'react'
import { EmojiPalette } from './components/EmojiPalette'
import { TilingCanvas } from './components/TilingCanvas'
import { GroupSelector } from './components/GroupSelector'
import { emojiToTwemojiUrl } from './data/emoji'
import { WALLPAPER_GROUPS } from './wallpaper/groups'
import type { WallpaperGroup } from './wallpaper/types'
import './App.css'

function App() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(['\u{1F600}'])
  const [group, setGroup] = useState<WallpaperGroup>(WALLPAPER_GROUPS[0])

  const activeEmoji = selectedEmojis[0] ?? '\u{1F600}'
  const emojiUrl = emojiToTwemojiUrl(activeEmoji)

  return (
    <div className="app">
      <div className="sidebar">
        <h1 className="app-title">Infinite Emoji</h1>
        <GroupSelector selected={group} onSelect={setGroup} />
        <EmojiPalette
          selectedEmojis={selectedEmojis}
          onSelectionChange={setSelectedEmojis}
        />
      </div>
      <div className="canvas-area">
        <TilingCanvas group={group} emojiUrl={emojiUrl} />
      </div>
    </div>
  )
}

export default App
