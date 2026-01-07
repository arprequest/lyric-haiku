export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  const songUrl = url.searchParams.get('url')

  if (!songUrl) {
    return new Response(JSON.stringify({ error: 'Missing URL parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Fetch the Genius lyrics page
    const response = await fetch(songUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch lyrics page')
    }

    const html = await response.text()

    // Extract lyrics from the page
    // Genius uses data-lyrics-container="true" for lyrics sections
    const lyrics = extractLyrics(html)

    if (!lyrics) {
      return new Response(JSON.stringify({ error: 'Could not extract lyrics' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ lyrics }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch lyrics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function extractLyrics(html) {
  // Method 1: Look for lyrics in data-lyrics-container divs
  const lyricsContainerRegex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi
  let matches = []
  let match

  while ((match = lyricsContainerRegex.exec(html)) !== null) {
    matches.push(match[1])
  }

  if (matches.length > 0) {
    let lyrics = matches.join('\n')
    return cleanLyrics(lyrics)
  }

  // Method 2: Look for Lyrics__Container class
  const containerRegex = /class="Lyrics__Container[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  matches = []

  while ((match = containerRegex.exec(html)) !== null) {
    matches.push(match[1])
  }

  if (matches.length > 0) {
    let lyrics = matches.join('\n')
    return cleanLyrics(lyrics)
  }

  return null
}

function cleanLyrics(html) {
  let text = html
    // Replace <br> tags with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Remove common non-lyric content
  const linesToRemove = [
    /^.*translations.*$/gim,
    /^.*contributors.*$/gim,
    /^.*transcription.*$/gim,
    /^.*see.*live.*$/gim,
    /^.*read more.*$/gim,
    /^.*expand.*$/gim,
    /^.*embed.*$/gim,
    /^.*share.*$/gim,
    /^.*copy.*link.*$/gim,
    /^.*sign up.*$/gim,
    /^.*log in.*$/gim,
    /^\d+\s*embed$/gim,
    /^you might also like$/gim,
    /^.*genius.*$/gim,
    /^pyong.*$/gim,
    /^\d+$/, // standalone numbers
  ]

  for (const pattern of linesToRemove) {
    text = text.replace(pattern, '')
  }

  // Split into lines and filter out short/suspicious lines at the end
  let lines = text.split('\n').map(line => line.trim())

  // Remove empty lines at start and end
  while (lines.length > 0 && lines[0] === '') lines.shift()
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  // Remove trailing lines that look like metadata (very short or contain numbers only)
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1].toLowerCase()
    if (
      lastLine.length < 3 ||
      /^\d+$/.test(lastLine) ||
      lastLine.includes('contributor') ||
      lastLine.includes('translation') ||
      lastLine.includes('embed')
    ) {
      lines.pop()
    } else {
      break
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
