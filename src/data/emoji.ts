import groupData from 'unicode-emoji-json/data-by-group.json'

export interface EmojiEntry {
  emoji: string
  name: string
  slug: string
}

export interface EmojiGroup {
  name: string
  slug: string
  emojis: EmojiEntry[]
}

export const emojiGroups: EmojiGroup[] = groupData as unknown as EmojiGroup[]

const TWEMOJI_BASE =
  'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.2/assets/72x72'

export function emojiToTwemojiUrl(emoji: string): string {
  const codepoints = [...emoji]
    .map((c) => c.codePointAt(0)!)
    .filter((cp) => cp !== 0xfe0f)
    .map((cp) => cp.toString(16))
    .join('-')
  return `${TWEMOJI_BASE}/${codepoints}.png`
}

export const GROUP_ICONS: Record<string, string> = {
  'Smileys & Emotion': '\u{1F600}',
  'People & Body': '\u{1F44B}',
  'Animals & Nature': '\u{1F43B}',
  'Food & Drink': '\u{1F354}',
  'Travel & Places': '\u{2708}\uFE0F',
  Activities: '\u{26BD}',
  Objects: '\u{1F4A1}',
  Symbols: '\u{2764}\uFE0F',
  Flags: '\u{1F3C1}',
}
