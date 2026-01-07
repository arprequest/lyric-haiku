import { syllable } from 'syllable'

/**
 * Count syllables in a line of text
 * @param {string} line - The text to count syllables in
 * @returns {number} - Number of syllables
 */
export function countSyllables(line) {
  if (!line || typeof line !== 'string') return 0

  // Clean the line - remove punctuation but keep words
  const cleaned = line
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')

  if (!cleaned) return 0

  return syllable(cleaned)
}

/**
 * Check if a line has exactly n syllables
 * @param {string} line - The text to check
 * @param {number} n - Target syllable count
 * @returns {boolean}
 */
export function hasSyllables(line, n) {
  return countSyllables(line) === n
}
