import { useState, useCallback, useEffect } from 'react'
import { EmojiPalette } from './components/EmojiPalette'
import { TilingCanvas } from './components/TilingCanvas'
import { GroupSelector } from './components/GroupSelector'
import { CellEditor } from './components/CellEditor'
import { Toolbar } from './components/Toolbar'
import { emojiToTwemojiUrl } from './data/emoji'
import { WALLPAPER_GROUPS, getGroup } from './wallpaper/groups'
import type { WallpaperGroup } from './wallpaper/types'
import { decodePermalink, encodePermalink } from './utils/permalink'
import { exportPng } from './utils/export'
import './App.css'

function getInitialState() {
  const pl = decodePermalink()
  return {
    emoji: pl.emoji ?? '\u{1F600}',
    group: pl.group ? getGroup(pl.group) : WALLPAPER_GROUPS[0],
    u: pl.u ?? 0.3,
    v: pl.v ?? 0.2,
    scale: pl.scale ?? 0.4,
    aspect: pl.aspect ?? 1,
  }
}

function App() {
  const [init] = useState(getInitialState)
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([init.emoji])
  const [group, setGroup] = useState<WallpaperGroup>(init.group)
  const [emojiPos, setEmojiPos] = useState({ u: init.u, v: init.v })
  const [emojiScale, setEmojiScale] = useState(init.scale)
  const [cellAspect, setCellAspect] = useState(init.aspect)

  const activeEmoji = selectedEmojis[0] ?? '\u{1F600}'
  const emojiUrl = emojiToTwemojiUrl(activeEmoji)

  // Update URL on state change
  useEffect(() => {
    const url = encodePermalink({
      emoji: activeEmoji,
      group: group.name,
      u: emojiPos.u,
      v: emojiPos.v,
      scale: emojiScale,
      aspect: cellAspect,
    })
    window.history.replaceState(null, '', url)
  }, [activeEmoji, group.name, emojiPos.u, emojiPos.v, emojiScale, cellAspect])

  const handlePositionChange = useCallback((u: number, v: number) => {
    setEmojiPos({ u, v })
  }, [])

  const handleExportPng = useCallback(() => {
    exportPng(group, emojiUrl, 120, emojiPos.u, emojiPos.v, emojiScale, cellAspect)
  }, [group, emojiUrl, emojiPos, emojiScale, cellAspect])

  const handleCopyLink = useCallback(async () => {
    const url = new URL(window.location.href)
    await navigator.clipboard.writeText(url.toString())
  }, [])

  return (
    <div className="app">
      <div className="sidebar">
        <h1 className="app-title">Infinite Emoji</h1>
        <Toolbar onExportPng={handleExportPng} onCopyLink={handleCopyLink} />
        <GroupSelector selected={group} onSelect={setGroup} />
        <CellEditor
          group={group}
          emojiUrl={emojiUrl}
          emojiU={emojiPos.u}
          emojiV={emojiPos.v}
          emojiScale={emojiScale}
          cellAspect={cellAspect}
          onPositionChange={handlePositionChange}
          onScaleChange={setEmojiScale}
          onAspectChange={setCellAspect}
        />
        <EmojiPalette
          selectedEmojis={selectedEmojis}
          onSelectionChange={(emojis) => {
            // Single-select: pick the newly added emoji
            const added = emojis.find(e => !selectedEmojis.includes(e))
            setSelectedEmojis(added ? [added] : emojis.slice(0, 1))
          }}
        />
      </div>
      <div className="canvas-area">
        <TilingCanvas
          group={group}
          emojiUrl={emojiUrl}
          cellAspect={cellAspect}
          emojiScale={emojiScale}
          emojiU={emojiPos.u}
          emojiV={emojiPos.v}
          onScaleChange={setEmojiScale}
          onAspectChange={setCellAspect}
        />
      </div>
    </div>
  )
}

export default App
