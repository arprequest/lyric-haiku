import { countSyllables } from './syllableCounter'

// ── Text helpers ──────────────────────────────────────────────────────────────

function normalizeText(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim()
}

function isTooSimilar(candidateNorm, usedNorms) {
  for (const used of usedNorms) {
    if (candidateNorm.includes(used) || used.includes(candidateNorm)) return true
  }
  return false
}

function parseLines(lyrics) {
  return lyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.match(/^\[.*\]$/))  // [Verse 1], [Chorus], etc.
    .filter(line => !line.match(/^\(.*\)$/))  // (instrumental), etc.
}

// ── Candidate expansion ───────────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  'oh', 'ooh', 'oooh', 'yeah', 'yea', 'yeh', 'whoa', 'woah',
  'hey', 'ah', 'ahh', 'aah', 'aaah', 'na', 'nah', 'la', 'da',
  'mm', 'mmm', 'hmm', 'hm', 'uh', 'um', 'yo', 'aye', 'ay',
])

/**
 * Strip leading filler words: "Oh yeah baby" → "baby"
 * Returns null if nothing was stripped or the whole line was filler.
 */
function stripLeadingFiller(line) {
  const words = line.split(/\s+/)
  let i = 0
  while (i < words.length) {
    const word = words[i].toLowerCase().replace(/[^a-z]/g, '')
    if (!word || FILLER_WORDS.has(word) || /^(na+|la+|da+|ba+|mm+|ah+|oh+)$/.test(word)) {
      i++
    } else {
      break
    }
  }
  if (i === 0 || i >= words.length) return null
  return words.slice(i).join(' ')
}

/**
 * Split a line at punctuation boundaries (comma, semicolon, dash, pipe).
 * Only returns fragments if the line actually split into 2+ meaningful pieces.
 */
function splitAtPunctuation(line) {
  const parts = line.split(/[,;|]|—|--|\s+-\s+|\s+\/\s+/)
  if (parts.length < 2) return []
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 2 && /[a-zA-Z]/.test(p) && p.split(/\s+/).length >= 2)
}

/**
 * Split a line at conjunction words: "I love you and I need you" →
 * ["I love you", "I need you"]
 */
function splitAtConjunction(line) {
  const results = []
  const conjRegex = /\s+(and|but|or|so|'?cause|because|when|while|though|if|then|as|till|until)\s+/gi
  let match
  while ((match = conjRegex.exec(line)) !== null) {
    const before = line.slice(0, match.index).trim()
    const after = line.slice(match.index + match[0].length).trim()
    if (
      before.length > 2 && after.length > 2 &&
      before.split(/\s+/).length >= 2 && after.split(/\s+/).length >= 2
    ) {
      results.push(before)
      results.push(after)
    }
  }
  return results
}

// Source priority for sorting — prefer whole authentic lines over fragments
const SOURCE_PRIORITY = { whole: 0, stripped: 1, fragment: 2, joined: 3 }

/**
 * Build the full candidate pool from raw lyric lines:
 * - Original whole lines
 * - Filler-stripped variants
 * - Punctuation splits
 * - Conjunction splits
 * - Consecutive-line joins (for very short lines)
 */
function buildCandidates(rawLines) {
  const seen = new Set()
  const candidates = []

  function add(text, source) {
    if (!text) return
    const t = text.trim()
    if (t.length < 3) return
    const norm = normalizeText(t)
    if (!norm || norm.split(/\s+/).length < 2) return  // need at least 2 words
    if (seen.has(norm)) return
    seen.add(norm)
    candidates.push({ text: t, source, norm })
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]

    add(line, 'whole')

    const stripped = stripLeadingFiller(line)
    if (stripped) add(stripped, 'stripped')

    splitAtPunctuation(line).forEach(f => add(f, 'fragment'))
    splitAtConjunction(line).forEach(f => add(f, 'fragment'))

    // Join with next line (helps with short consecutive lines)
    if (i + 1 < rawLines.length) {
      add(line + ' ' + rawLines[i + 1], 'joined')
    }
  }

  return candidates
}

/**
 * Bucket candidates by syllable count.
 * Only keeps counts in range [2, 10].
 */
function bucketBySyllable(candidates) {
  const buckets = {}
  for (const c of candidates) {
    const n = countSyllables(c.text)
    if (n < 2 || n > 10) continue
    if (!buckets[n]) buckets[n] = []
    buckets[n].push({ ...c, syllables: n })
  }
  // Sort each bucket: whole lines first, then stripped, fragments, joined
  for (const n of Object.keys(buckets)) {
    buckets[n].sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source])
  }
  return buckets
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an exact 5-7-5 haiku from song lyrics.
 * Expands the candidate pool using splits, joins, and filler-stripping,
 * then uses backtracking search across all (line1, line2, line3) combinations.
 */
export function generateHaiku(lyrics) {
  const rawLines = parseLines(lyrics)
  const candidates = buildCandidates(rawLines)
  const buckets = bucketBySyllable(candidates)

  const fives = buckets[5] || []
  const sevens = buckets[7] || []

  if (fives.length < 2 || sevens.length < 1) {
    return { haiku: [], lines: [], success: false, isExact: false }
  }

  // Backtracking search: try all (l1, l2, l3) combinations in priority order
  for (const l1 of fives) {
    const used1 = new Set([l1.norm])
    for (const l2 of sevens) {
      if (isTooSimilar(l2.norm, used1)) continue
      const used12 = new Set([...used1, l2.norm])
      for (const l3 of fives) {
        if (isTooSimilar(l3.norm, used12)) continue
        return {
          haiku: [l1.text, l2.text, l3.text],
          lines: [
            { original: l1.text, syllables: 5 },
            { original: l2.text, syllables: 7 },
            { original: l3.text, syllables: 5 },
          ],
          success: true,
          isExact: true,
        }
      }
    }
  }

  return { haiku: [], lines: [], success: false, isExact: false }
}

/**
 * Generate the closest possible haiku when exact 5-7-5 is not available.
 * Uses the same expanded candidate pool and picks the nearest syllable count
 * for each slot.
 */
export function generateClosestHaiku(lyrics) {
  const rawLines = parseLines(lyrics)

  if (rawLines.length < 3) {
    return { haiku: [], lines: [], success: false, isExact: false }
  }

  const candidates = buildCandidates(rawLines)
  const buckets = bucketBySyllable(candidates)

  // Flatten into a single sorted array for closest-match search
  const all = Object.values(buckets).flat()

  const targets = [5, 7, 5]
  const result = []
  const usedNorms = new Set()

  for (const target of targets) {
    // Try exact match first (already sorted by priority within bucket)
    const exact = (buckets[target] || []).find(c => !isTooSimilar(c.norm, usedNorms))
    if (exact) {
      usedNorms.add(exact.norm)
      result.push(exact)
      continue
    }

    // Fall back to closest syllable count
    let best = null
    let bestDiff = Infinity
    for (const c of all) {
      if (isTooSimilar(c.norm, usedNorms)) continue
      const diff = Math.abs(c.syllables - target)
      if (diff < bestDiff || (diff === bestDiff && SOURCE_PRIORITY[c.source] < SOURCE_PRIORITY[best.source])) {
        bestDiff = diff
        best = c
      }
    }

    if (!best) return { haiku: [], lines: [], success: false, isExact: false }
    usedNorms.add(best.norm)
    result.push(best)
  }

  const isExact = result[0].syllables === 5 &&
                  result[1].syllables === 7 &&
                  result[2].syllables === 5

  return {
    haiku: result.map(r => r.text),
    lines: result.map(r => ({ original: r.text, syllables: r.syllables })),
    success: true,
    isExact,
  }
}

/**
 * Analyze lyrics and return syllable counts for all lines.
 */
export function analyzeLyrics(lyrics) {
  const lines = parseLines(lyrics)
  return lines.map(line => ({
    line,
    syllables: countSyllables(line),
  }))
}
