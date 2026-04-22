export function tokenizePinyinWithTone(pinyin) {
  if (!pinyin || typeof pinyin !== 'string') return [];

  const normalized = pinyin.replace(/\s+/g, ' ');
  const tokens = [];
  const re = /(\s+|[A-Za-zÜü]+[0-9]*|[0-9]+|[^A-Za-zÜü0-9\s]+)/g;
  const parts = normalized.match(re) || [];

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      tokens.push({ kind: 'raw', text: part });
      continue;
    }

    if (/^[A-Za-zÜü]+[0-9]*$/.test(part)) {
      const m = part.match(/^([A-Za-zÜü]+)([0-9]+)?$/);
      if (m) {
        tokens.push({
          kind: 'syllable',
          base: m[1],
          tone: m[2] || ''
        });
      } else {
        tokens.push({ kind: 'raw', text: part });
      }
      continue;
    }

    tokens.push({ kind: 'raw', text: part });
  }

  return tokens;
}

export function pickPinyinForToneDisplay(item) {
  if (!item) return '';
  return item.pinyinWithTone || item.pinyinTone || item.pinyin || '';
}

