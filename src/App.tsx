import { useState } from 'react'
import { EmojiPalette } from './components/EmojiPalette'
import { emojiToTwemojiUrl } from './data/emoji'

function App() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100dvh',
      }}
    >
      <h1 style={{ margin: '0 0 8px' }}>infinite-emoji-generator</h1>
      <p style={{ color: '#888', margin: '0 0 24px' }}>
        壁紙群の対称性で絵文字をタイリングする Web アプリ
      </p>

      <EmojiPalette
        selectedEmojis={selectedEmojis}
        onSelectionChange={setSelectedEmojis}
      />

      {selectedEmojis.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: 14 }}>
            選択中: {selectedEmojis.length} 個
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {selectedEmojis.map((emoji) => (
              <img
                key={emoji}
                src={emojiToTwemojiUrl(emoji)}
                alt={emoji}
                style={{ width: 32, height: 32 }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
