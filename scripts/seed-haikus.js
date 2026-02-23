#!/usr/bin/env node
/**
 * Seed haikus for popular songs into D1 via Cloudflare HTTP API.
 *
 * Prerequisites:
 *   - GENIUS_ACCESS_TOKEN env var
 *   - CF_EMAIL env var (Cloudflare account email)
 *   - CF_API_KEY env var (Cloudflare global API key)
 *   - CF_ACCOUNT_ID env var
 *   - CF_D1_ID env var (D1 database UUID)
 *
 * Usage:
 *   node scripts/seed-haikus.js                  # seed new songs (skip existing)
 *   node scripts/seed-haikus.js --limit 20       # only process first 20 songs
 *   node scripts/seed-haikus.js --dry-run        # preview without writing to D1
 *   node scripts/seed-haikus.js --regen-approximate  # re-run only approximate haikus
 */

import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { syllable } from 'syllable'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const REGEN_APPROXIMATE = args.includes('--regen-approximate')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  return i !== -1 ? parseInt(args[i + 1], 10) : Infinity
})()

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN
const CF_EMAIL = process.env.CF_EMAIL
const CF_API_KEY = process.env.CF_API_KEY
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
const CF_D1_ID = process.env.CF_D1_ID

if (!GENIUS_TOKEN) { console.error('Missing GENIUS_ACCESS_TOKEN'); process.exit(1) }
if (!DRY_RUN && (!CF_EMAIL || !CF_API_KEY || !CF_ACCOUNT_ID || !CF_D1_ID)) {
  console.error('Missing CF_EMAIL, CF_API_KEY, CF_ACCOUNT_ID, or CF_D1_ID')
  process.exit(1)
}

// ── Haiku generation (mirrors src/utils/haikuGenerator.js) ─────────────────

const FILLER_WORDS = new Set([
  'oh', 'ooh', 'oooh', 'yeah', 'yea', 'yeh', 'whoa', 'woah',
  'hey', 'ah', 'ahh', 'aah', 'aaah', 'na', 'nah', 'la', 'da',
  'mm', 'mmm', 'hmm', 'hm', 'uh', 'um', 'yo', 'aye', 'ay',
])

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
  return lyrics.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    .filter(l => !l.match(/^\[.*\]$/)).filter(l => !l.match(/^\(.*\)$/))
}

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

function splitAtPunctuation(line) {
  const parts = line.split(/[,;|]|—|--|\s+-\s+|\s+\/\s+/)
  if (parts.length < 2) return []
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 2 && /[a-zA-Z]/.test(p) && p.split(/\s+/).length >= 2)
}

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

const SOURCE_PRIORITY = { whole: 0, stripped: 1, fragment: 2, joined: 3 }

function buildCandidates(rawLines) {
  const seen = new Set()
  const candidates = []

  function add(text, source) {
    if (!text) return
    const t = text.trim()
    if (t.length < 3) return
    const norm = normalizeText(t)
    if (!norm || norm.split(/\s+/).length < 2) return
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
    if (i + 1 < rawLines.length) add(line + ' ' + rawLines[i + 1], 'joined')
  }

  return candidates
}

function bucketBySyllable(candidates) {
  const buckets = {}
  for (const c of candidates) {
    const n = syllable(c.text.toLowerCase().replace(/[^\w\s']/g, ''))
    if (n < 2 || n > 10) continue
    if (!buckets[n]) buckets[n] = []
    buckets[n].push({ ...c, syllables: n })
  }
  for (const n of Object.keys(buckets)) {
    buckets[n].sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source])
  }
  return buckets
}

function generateHaiku(lyrics) {
  const rawLines = parseLines(lyrics)
  const candidates = buildCandidates(rawLines)
  const buckets = bucketBySyllable(candidates)

  const fives = buckets[5] || []
  const sevens = buckets[7] || []

  if (fives.length < 2 || sevens.length < 1) return null

  for (const l1 of fives) {
    const used1 = new Set([l1.norm])
    for (const l2 of sevens) {
      if (isTooSimilar(l2.norm, used1)) continue
      const used12 = new Set([...used1, l2.norm])
      for (const l3 of fives) {
        if (isTooSimilar(l3.norm, used12)) continue
        return { haiku: [l1.text, l2.text, l3.text], isExact: true }
      }
    }
  }
  return null
}

function generateClosestHaiku(lyrics) {
  const rawLines = parseLines(lyrics)
  if (rawLines.length < 3) return null

  const candidates = buildCandidates(rawLines)
  const buckets = bucketBySyllable(candidates)
  const all = Object.values(buckets).flat()
  const targets = [5, 7, 5]
  const result = []
  const usedNorms = new Set()

  for (const target of targets) {
    const exact = (buckets[target] || []).find(c => !isTooSimilar(c.norm, usedNorms))
    if (exact) {
      usedNorms.add(exact.norm)
      result.push(exact)
      continue
    }
    let best = null, bestDiff = Infinity
    for (const c of all) {
      if (isTooSimilar(c.norm, usedNorms)) continue
      const diff = Math.abs(c.syllables - target)
      if (diff < bestDiff || (diff === bestDiff && best && SOURCE_PRIORITY[c.source] < SOURCE_PRIORITY[best.source])) {
        bestDiff = diff; best = c
      }
    }
    if (!best) return null
    usedNorms.add(best.norm)
    result.push(best)
  }

  const isExact = result[0].syllables === 5 && result[1].syllables === 7 && result[2].syllables === 5
  return { haiku: result.map(r => r.text), isExact }
}

// ── Lyrics fetching ─────────────────────────────────────────────────────────

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
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

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

// ── D1 HTTP API ─────────────────────────────────────────────────────────────

async function d1Query(sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_ID}/query`,
    {
      method: 'POST',
      headers: {
        'X-Auth-Email': CF_EMAIL,
        'X-Auth-Key': CF_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    }
  )
  const data = await res.json()
  if (!data.success) throw new Error(JSON.stringify(data.errors))
  return data.result?.[0]
}

async function insertHaiku(id, haiku, song, isExact) {
  await d1Query(
    `INSERT OR IGNORE INTO haikus (id, line1, line2, line3, song_title, song_artist, is_exact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, haiku[0], haiku[1], haiku[2], song.title, song.artist, isExact ? 1 : 0, Date.now()]
  )
}

async function replaceHaiku(oldId, haiku, song) {
  await d1Query(`DELETE FROM haikus WHERE id = ?`, [oldId])
  await d1Query(
    `INSERT INTO haikus (id, line1, line2, line3, song_title, song_artist, is_exact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), haiku[0], haiku[1], haiku[2], song.title, song.artist, 1, Date.now()]
  )
}

async function fetchApproximateHaikus() {
  const result = await d1Query(
    `SELECT id, song_title, song_artist FROM haikus WHERE is_exact = 0`
  )
  return result?.results || []
}

// ── Main ────────────────────────────────────────────────────────────────────

const songs = JSON.parse(readFileSync(join(__dirname, 'seed-songs.json'), 'utf8'))

let songsToProcess = songs

if (REGEN_APPROXIMATE) {
  // Fetch approximate haikus from D1 and filter seeds to only those songs
  console.log('Fetching approximate haikus from D1...')
  const approxRows = await fetchApproximateHaikus()
  console.log(`Found ${approxRows.length} approximate haikus in D1\n`)

  // Build lookup: "title|artist" → row id
  const approxMap = new Map()
  for (const row of approxRows) {
    const key = `${row.song_title?.toLowerCase()}|${row.song_artist?.toLowerCase()}`
    approxMap.set(key, row.id)
  }

  // Filter seed list to only songs with approximate haikus in D1
  songsToProcess = songs.filter(s => {
    const key = `${s.title.toLowerCase()}|${s.artist.toLowerCase()}`
    return approxMap.has(key)
  })

  // Attach the existing D1 id to each song for replacement
  songsToProcess = songsToProcess.map(s => ({
    ...s,
    _existingId: approxMap.get(`${s.title.toLowerCase()}|${s.artist.toLowerCase()}`)
  }))

  console.log(`${songsToProcess.length} seeded songs have approximate haikus — regenerating...\n`)
}

if (LIMIT !== Infinity) songsToProcess = songsToProcess.slice(0, LIMIT)

let improved = 0, stillApprox = 0, skipped = 0, failed = 0

const mode = DRY_RUN ? ' (dry run)' : REGEN_APPROXIMATE ? ' (regen approximate)' : ' (remote D1 via API)'
console.log(`Processing ${songsToProcess.length} songs${mode}...\n`)

for (const song of songsToProcess) {
  process.stdout.write(`  ${song.artist} — ${song.title} ... `)

  try {
    const lyrics = await fetchLyrics(song.url)
    if (!lyrics) { console.log('✗ no lyrics'); skipped++; continue }

    const result = generateHaiku(lyrics) || generateClosestHaiku(lyrics)
    if (!result) { console.log('✗ no haiku found'); skipped++; continue }

    if (DRY_RUN) {
      const tag = result.isExact ? '5-7-5 ✓' : 'approx'
      console.log(`${tag}\n    ${result.haiku.join(' / ')}`)
      if (result.isExact) improved++; else stillApprox++
      continue
    }

    if (REGEN_APPROXIMATE) {
      if (result.isExact) {
        await replaceHaiku(song._existingId, result.haiku, song)
        console.log('✓ upgraded to 5-7-5')
        improved++
      } else {
        console.log('~ still approximate, keeping original')
        stillApprox++
      }
    } else {
      await insertHaiku(randomUUID(), result.haiku, song, result.isExact)
      console.log(`✓ ${result.isExact ? '5-7-5' : 'approx'}`)
      if (result.isExact) improved++; else stillApprox++
    }
  } catch (err) {
    console.log(`✗ ${err.message}`)
    failed++
  }

  await new Promise(r => setTimeout(r, 350))
}

if (REGEN_APPROXIMATE) {
  console.log(`\nDone: ${improved} upgraded to exact, ${stillApprox} still approximate, ${skipped} skipped, ${failed} failed`)
} else {
  console.log(`\nDone: ${improved} exact, ${stillApprox} approximate, ${skipped} skipped, ${failed} failed`)
}
