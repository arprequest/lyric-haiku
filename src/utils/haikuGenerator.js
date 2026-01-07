import { countSyllables } from './syllableCounter'

/**
 * Normalize text for duplicate detection
 * Lowercases, removes punctuation, trims whitespace
 */
function normalizeText(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim()
}

/**
 * Parse lyrics into individual lines
 * @param {string} lyrics - Raw lyrics text
 * @returns {string[]} - Array of non-empty lines
 */
function parseLines(lyrics) {
  return lyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    // Filter out common non-lyric lines
    .filter(line => !line.match(/^\[.*\]$/)) // [Verse 1], [Chorus], etc.
    .filter(line => !line.match(/^\(.*\)$/)) // (instrumental), etc.
}

/**
 * Find line with exact syllable count
 */
function findLineWithSyllables(lines, syllableCount, usedIndices, usedTexts) {
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue
    const normalized = normalizeText(lines[i])
    if (usedTexts.has(normalized)) continue
    const count = countSyllables(lines[i])
    if (count === syllableCount) {
      return { line: lines[i], index: i, syllables: count }
    }
  }
  return null
}

/**
 * Find line closest to target syllable count
 */
function findClosestLine(lines, targetSyllables, usedIndices, usedTexts) {
  let bestMatch = null
  let bestDiff = Infinity

  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue
    const normalized = normalizeText(lines[i])
    if (usedTexts.has(normalized)) continue
    const count = countSyllables(lines[i])
    // Skip very short or very long lines
    if (count < 2 || count > 12) continue

    const diff = Math.abs(count - targetSyllables)
    if (diff < bestDiff) {
      bestDiff = diff
      bestMatch = { line: lines[i], index: i, syllables: count }
    }
  }

  return bestMatch
}

/**
 * Generate an exact 5-7-5 haiku from song lyrics
 * @param {string} lyrics - The song lyrics
 * @returns {{ haiku: string[], lines: { original: string, syllables: number }[], success: boolean, isExact: boolean }}
 */
export function generateHaiku(lyrics) {
  const lines = parseLines(lyrics)
  const usedIndices = new Set()
  const usedTexts = new Set()

  // Find first line with 5 syllables
  const line1 = findLineWithSyllables(lines, 5, usedIndices, usedTexts)
  if (!line1) {
    return { haiku: [], lines: [], success: false, isExact: false }
  }
  usedIndices.add(line1.index)
  usedTexts.add(normalizeText(line1.line))

  // Find first line with 7 syllables
  const line2 = findLineWithSyllables(lines, 7, usedIndices, usedTexts)
  if (!line2) {
    return { haiku: [], lines: [], success: false, isExact: false }
  }
  usedIndices.add(line2.index)
  usedTexts.add(normalizeText(line2.line))

  // Find second line with 5 syllables
  const line3 = findLineWithSyllables(lines, 5, usedIndices, usedTexts)
  if (!line3) {
    return { haiku: [], lines: [], success: false, isExact: false }
  }

  return {
    haiku: [line1.line, line2.line, line3.line],
    lines: [
      { original: line1.line, syllables: 5 },
      { original: line2.line, syllables: 7 },
      { original: line3.line, syllables: 5 }
    ],
    success: true,
    isExact: true
  }
}

/**
 * Generate closest possible haiku when exact 5-7-5 not available
 * @param {string} lyrics - The song lyrics
 * @returns {{ haiku: string[], lines: { original: string, syllables: number }[], success: boolean, isExact: boolean }}
 */
export function generateClosestHaiku(lyrics) {
  const lines = parseLines(lyrics)

  if (lines.length < 3) {
    return { haiku: [], lines: [], success: false, isExact: false }
  }

  const usedIndices = new Set()
  const usedTexts = new Set()
  const targets = [5, 7, 5]
  const result = []

  for (const target of targets) {
    // Try exact match first
    let match = findLineWithSyllables(lines, target, usedIndices, usedTexts)

    // Fall back to closest match
    if (!match) {
      match = findClosestLine(lines, target, usedIndices, usedTexts)
    }

    if (!match) {
      return { haiku: [], lines: [], success: false, isExact: false }
    }

    usedIndices.add(match.index)
    usedTexts.add(normalizeText(match.line))
    result.push(match)
  }

  const isExact = result[0].syllables === 5 &&
                  result[1].syllables === 7 &&
                  result[2].syllables === 5

  return {
    haiku: result.map(r => r.line),
    lines: result.map(r => ({ original: r.line, syllables: r.syllables })),
    success: true,
    isExact
  }
}

/**
 * Analyze lyrics and return syllable counts for all lines
 */
export function analyzeLyrics(lyrics) {
  const lines = parseLines(lyrics)
  return lines.map(line => ({
    line,
    syllables: countSyllables(line)
  }))
}
