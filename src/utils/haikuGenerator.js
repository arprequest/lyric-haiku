import { countSyllables } from './syllableCounter'

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
 * Find lines with a specific syllable count
 * @param {string[]} lines - Array of lines
 * @param {number} syllableCount - Target syllable count
 * @param {Set<number>} usedIndices - Indices already used
 * @returns {{ line: string, index: number } | null}
 */
function findLineWithSyllables(lines, syllableCount, usedIndices) {
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue

    const count = countSyllables(lines[i])
    if (count === syllableCount) {
      return { line: lines[i], index: i }
    }
  }
  return null
}

/**
 * Generate a haiku from song lyrics
 * Haiku structure: 5-7-5 syllables
 * @param {string} lyrics - The song lyrics
 * @returns {{ haiku: string[], lines: { original: string, syllables: number }[], success: boolean }}
 */
export function generateHaiku(lyrics) {
  const lines = parseLines(lyrics)
  const usedIndices = new Set()

  // Find first line with 5 syllables
  const line1 = findLineWithSyllables(lines, 5, usedIndices)
  if (!line1) {
    return {
      haiku: [],
      lines: [],
      success: false,
      error: 'Could not find a line with 5 syllables for the first line'
    }
  }
  usedIndices.add(line1.index)

  // Find first line with 7 syllables
  const line2 = findLineWithSyllables(lines, 7, usedIndices)
  if (!line2) {
    return {
      haiku: [],
      lines: [],
      success: false,
      error: 'Could not find a line with 7 syllables for the second line'
    }
  }
  usedIndices.add(line2.index)

  // Find second line with 5 syllables
  const line3 = findLineWithSyllables(lines, 5, usedIndices)
  if (!line3) {
    return {
      haiku: [],
      lines: [],
      success: false,
      error: 'Could not find a second line with 5 syllables for the third line'
    }
  }

  return {
    haiku: [line1.line, line2.line, line3.line],
    lines: [
      { original: line1.line, syllables: 5 },
      { original: line2.line, syllables: 7 },
      { original: line3.line, syllables: 5 }
    ],
    success: true
  }
}

/**
 * Analyze lyrics and return syllable counts for all lines
 * @param {string} lyrics - The song lyrics
 * @returns {{ line: string, syllables: number }[]}
 */
export function analyzeLyrics(lyrics) {
  const lines = parseLines(lyrics)
  return lines.map(line => ({
    line,
    syllables: countSyllables(line)
  }))
}
