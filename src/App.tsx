import twemoji from '@twemoji/api'
import { useEffect, useRef } from 'react'

function App() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      twemoji.parse(ref.current)
    }
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div ref={ref} style={{ fontSize: '64px' }}>
        🎨
      </div>
      <h1>infinite-emoji-generator</h1>
      <p style={{ color: '#888' }}>
        壁紙群の対称性で絵文字をタイリングする Web アプリ
      </p>
    </div>
  )
}

export default App
