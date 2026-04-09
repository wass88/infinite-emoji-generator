import { useState, useCallback, useEffect } from 'react'
import { EmojiPalette } from './components/EmojiPalette'
import { TilingCanvas } from './components/TilingCanvas'
import { GroupSelector } from './components/GroupSelector'
import { CellEditor } from './components/CellEditor'
import { Toolbar } from './components/Toolbar'
import { emojiToTwemojiUrl } from './data/emoji'
import { WALLPAPER_GROUPS, getGroup, isAspectLocked, isSkewAllowed } from './wallpaper/groups'
import type { WallpaperGroup } from './wallpaper/types'
import { decodePermalink, encodePermalink } from './utils/permalink'
import { exportPng, exportCell } from './utils/export'
import './App.css'

function getInitialState() {
  const pl = decodePermalink()
  return {
    emoji: pl.emoji ?? '\u{1F600}',
    group: pl.group ? getGroup(pl.group) : WALLPAPER_GROUPS[0],
    u: pl.u ?? 0.3,
    v: pl.v ?? 0.2,
    scale: pl.scale ?? 0.4,
    rot: pl.rot ?? 0,
    aspect: pl.aspect ?? 1,
    skew: pl.skew ?? 0,
  }
}

function App() {
  const [init] = useState(getInitialState)
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([init.emoji])
  const [group, setGroup] = useState<WallpaperGroup>(init.group)
  const [emojiPos, setEmojiPos] = useState({ u: init.u, v: init.v })
  const [emojiScale, setEmojiScale] = useState(init.scale)
  const [emojiRotation, setEmojiRotation] = useState(init.rot)
  const [cellAspect, setCellAspect] = useState(init.aspect)
  const [cellSkew, setCellSkew] = useState(init.skew)

  const activeEmoji = selectedEmojis[0] ?? '\u{1F600}'
  const emojiUrl = emojiToTwemojiUrl(activeEmoji)

  useEffect(() => {
    const url = encodePermalink({
      emoji: activeEmoji, group: group.name,
      u: emojiPos.u, v: emojiPos.v,
      scale: emojiScale, rot: emojiRotation,
      aspect: cellAspect, skew: cellSkew,
    })
    window.history.replaceState(null, '', url)
  }, [activeEmoji, group.name, emojiPos.u, emojiPos.v, emojiScale, emojiRotation, cellAspect, cellSkew])

  const handleGroupChange = useCallback((g: WallpaperGroup) => {
    setGroup(g)
    if (isAspectLocked(g)) setCellAspect(1)
    if (!isSkewAllowed(g)) setCellSkew(0)
  }, [])

  const handleExportPng = useCallback(() => {
    exportPng(group, emojiUrl, 120, emojiPos.u, emojiPos.v, emojiScale, emojiRotation, cellAspect, cellSkew)
  }, [group, emojiUrl, emojiPos, emojiScale, emojiRotation, cellAspect, cellSkew])

  const handleExportCell = useCallback(() => {
    exportCell(group, emojiUrl, 120, emojiPos.u, emojiPos.v, emojiScale, emojiRotation, cellAspect, cellSkew)
  }, [group, emojiUrl, emojiPos, emojiScale, emojiRotation, cellAspect, cellSkew])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'Infinite Emoji', url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
    }
  }, [])

  return (
    <div className="app">
      <div className="sidebar">
        <h1 className="app-title">Infinite Emoji</h1>
        <Toolbar onExportPng={handleExportPng} onExportCell={handleExportCell} onShare={handleShare} />
        <GroupSelector selected={group} onSelect={handleGroupChange} />
        <CellEditor
          group={group}
          emojiUrl={emojiUrl}
          emojiU={emojiPos.u}
          emojiV={emojiPos.v}
          emojiScale={emojiScale}
          emojiRotation={emojiRotation}
          cellAspect={cellAspect}
          cellSkew={cellSkew}
          onPositionChange={useCallback((u: number, v: number) => setEmojiPos({ u, v }), [])}
          onScaleChange={setEmojiScale}
          onRotationChange={setEmojiRotation}
          onAspectChange={setCellAspect}
          onSkewChange={setCellSkew}
        />
        <EmojiPalette
          selectedEmojis={selectedEmojis}
          onSelectionChange={(emojis) => {
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
          cellSkew={cellSkew}
          emojiScale={emojiScale}
          emojiRotation={emojiRotation}
          emojiU={emojiPos.u}
          emojiV={emojiPos.v}
        />
      </div>
    </div>
  )
}

export default App
