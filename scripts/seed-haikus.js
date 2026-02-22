#!/usr/bin/env node
/**
 * Seed haikus for popular songs into D1.
 *
 * Prerequisites:
 *   - GENIUS_ACCESS_TOKEN env var (or pass via --token flag)
 *   - wrangler installed and authenticated
 *
 * Usage:
 *   node scripts/seed-haikus.js
 *   node scripts/seed-haikus.js --limit 20
 *   node scripts/seed-haikus.js --dry-run
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Load syllable counter and haiku generator from src
// We need to use the compiled/cjs version or inline the logic
// Since the src files use ES modules, we replicate the core logic here
import { syllable } from 'syllable'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  return i !== -1 ? parseInt(args[i + 1], 10) : Infinity
})()
const DB_NAME = args.includes('--remote') ? 'lyric-haiku' : 'lyric-haiku'
const REMOTE = args.includes('--remote')

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN || process.env.GENIUS_API_KEY

if (!GENIUS_TOKEN) {
  console.error('Error: GENIUS_ACCESS_TOKEN environment variable is required')
  process.exit(1)
}

const songs = JSON.parse(readFileSync(join(__dirname, 'seed-songs.json'), 'utf8'))
const limited = songs.slice(0, LIMIT === Infinity ? songs.length : LIMIT)

// ── Haiku generation (inlined from src/utils) ──────────────────────────────

function normalizeText(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim()
}

function isTooSimilar(candidateNormalized, usedTexts) {
  for (const used of usedTexts) {
    if (candidateNormalized.includes(used) || used.includes(candidateNormalized)) return true
  }
  return false
}

function parseLines(lyrics) {
  return lyrics
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !l.match(/^\[.*\]$/))
    .filter(l => !l.match(/^\(.*\)$/))
}

function countSyllables(line) {
  return syllable(line)
}

function findLineWithSyllables(lines, target, usedIndices, usedTexts) {
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue
    const normalized = normalizeText(lines[i])
    if (usedTexts.has(normalized)) continue
    if (isTooSimilar(normalized, usedTexts)) continue
    if (countSyllables(lines[i]) === target) return { line: lines[i], index: i, syllables: target }
  }
  return null
}

function findClosestLine(lines, target, usedIndices, usedTexts) {
  let best = null, bestDiff = Infinity
  for (let i = 0; i < lines.length; i++) {
    if (usedIndices.has(i)) continue
    const normalized = normalizeText(lines[i])
    if (usedTexts.has(normalized)) continue
    if (isTooSimilar(normalized, usedTexts)) continue
    const count = countSyllables(lines[i])
    if (count < 2 || count > 12) continue
    const diff = Math.abs(count - target)
    if (diff < bestDiff) { bestDiff = diff; best = { line: lines[i], index: i, syllables: count } }
  }
  return best
}

function generateHaiku(lyrics) {
  const lines = parseLines(lyrics)
  const usedIndices = new Set(), usedTexts = new Set()
  const line1 = findLineWithSyllables(lines, 5, usedIndices, usedTexts)
  if (!line1) return null
  usedIndices.add(line1.index); usedTexts.add(normalizeText(line1.line))
  const line2 = findLineWithSyllables(lines, 7, usedIndices, usedTexts)
  if (!line2) return null
  usedIndices.add(line2.index); usedTexts.add(normalizeText(line2.line))
  const line3 = findLineWithSyllables(lines, 5, usedIndices, usedTexts)
  if (!line3) return null
  return { haiku: [line1.line, line2.line, line3.line], isExact: true }
}

function generateClosestHaiku(lyrics) {
  const lines = parseLines(lyrics)
  if (lines.length < 3) return null
  const usedIndices = new Set(), usedTexts = new Set()
  const result = []
  for (const target of [5, 7, 5]) {
    let match = findLineWithSyllables(lines, target, usedIndices, usedTexts)
    if (!match) match = findClosestLine(lines, target, usedIndices, usedTexts)
    if (!match) return null
    usedIndices.add(match.index); usedTexts.add(normalizeText(match.line))
    result.push(match)
  }
  const isExact = result[0].syllables === 5 && result[1].syllables === 7 && result[2].syllables === 5
  return { haiku: result.map(r => r.line), isExact }
}

// ── Lyrics fetching ────────────────────────────────────────────────────────

async function fetchLyrics(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const containerRegex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi
  const matches = []
  let match
  while ((match = containerRegex.exec(html)) !== null) matches.push(match[1])

  if (!matches.length) return null

  let text = matches.join('\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim()

  const badKeywords = ['translation','contributor','read more','expand','embed','share url',
    'copy link','sign up','log in','you might also like','genius','pyong','see live',
    'get tickets','how to format lyrics','advertisement','verified']

  const lines = text.split('\n').map(l => l.trim()).filter(l => {
    if (l === '') return true
    const lower = l.toLowerCase()
    if (badKeywords.some(k => lower.includes(k))) return false
    if (/^\d+$/.test(l)) return false
    if (/^\d+\s*(contributors?|translations?|embed)/i.test(l)) return false
    return true
  })

  while (lines.length && lines[0] === '') lines.shift()
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ── D1 insertion via wrangler ──────────────────────────────────────────────

function insertHaiku(id, haiku, song, isExact) {
  const createdAt = Date.now()
  const sql = `INSERT OR IGNORE INTO haikus (id, line1, line2, line3, song_title, song_artist, is_exact, created_at) VALUES ('${id}', '${esc(haiku[0])}', '${esc(haiku[1])}', '${esc(haiku[2])}', '${esc(song.title)}', '${esc(song.artist)}', ${isExact ? 1 : 0}, ${createdAt});`
  const remoteFlag = REMOTE ? '--remote' : '--local'
  execSync(`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --command "${sql}"`, {
    cwd: join(__dirname, '..'),
    stdio: 'pipe'
  })
}

function esc(str) {
  return String(str || '').replace(/'/g, "''")
}

// ── Main ───────────────────────────────────────────────────────────────────

let success = 0, skipped = 0, failed = 0

console.log(`Seeding ${limited.length} songs${DRY_RUN ? ' (dry run)' : REMOTE ? ' (remote D1)' : ' (local D1)'}...\n`)

for (const song of limited) {
  process.stdout.write(`  ${song.artist} — ${song.title} ... `)

  try {
    const lyrics = await fetchLyrics(song.url)
    if (!lyrics) { console.log('✗ no lyrics'); skipped++; continue }

    const result = generateHaiku(lyrics) || generateClosestHaiku(lyrics)
    if (!result) { console.log('✗ no haiku found'); skipped++; continue }

    if (DRY_RUN) {
      console.log(`✓ (dry run)\n    ${result.haiku.join(' / ')}`)
      success++
      continue
    }

    const id = randomUUID()
    insertHaiku(id, result.haiku, song, result.isExact)
    console.log(`✓ ${result.isExact ? '5-7-5' : 'approx'}`)
    success++
  } catch (err) {
    console.log(`✗ ${err.message}`)
    failed++
  }

  // Small delay to avoid hammering Genius
  await new Promise(r => setTimeout(r, 500))
}

console.log(`\nDone: ${success} seeded, ${skipped} skipped, ${failed} failed`)
