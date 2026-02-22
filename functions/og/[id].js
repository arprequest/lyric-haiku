// GET /og/[id] — Dynamic OG image for haiku permalink pages
// Returns a 1200×630 PNG card suitable for Twitter/X, Facebook, iMessage, etc.

import satori from 'satori'
import { Resvg, initWasm } from '@resvg/resvg-wasm'

// Module-level state — reused within the same isolate lifetime
let wasmReady = false
let fontRegular = null
let fontBold = null
let fontItalic = null

async function ensureReady() {
  if (wasmReady && fontRegular && fontBold && fontItalic) return

  const [_, regular, bold, italic] = await Promise.all([
    wasmReady
      ? Promise.resolve()
      : initWasm(
          fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm')
        ).then(() => { wasmReady = true }),

    fontRegular
      ? Promise.resolve(fontRegular)
      : fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff')
          .then(r => r.arrayBuffer()),

    fontBold
      ? Promise.resolve(fontBold)
      : fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFp4kZI.woff')
          .then(r => r.arrayBuffer()),

    fontItalic
      ? Promise.resolve(fontItalic)
      : fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff')
          .then(r => r.arrayBuffer()),
  ])

  if (!fontRegular) fontRegular = regular
  if (!fontBold) fontBold = bold
  if (!fontItalic) fontItalic = italic
}

export async function onRequestGet(context) {
  const { env, params } = context
  const id = params.id

  if (!id) return new Response('Not found', { status: 404 })

  try {
    const row = await env.DB.prepare(`
      SELECT line1, line2, line3, song_title, song_artist FROM haikus WHERE id = ?
    `).bind(id).first()

    if (!row) return new Response('Not found', { status: 404 })

    await ensureReady()

    const haiku = [row.line1, row.line2, row.line3]
    const songLine = row.song_title
      ? `${row.song_title}  ·  ${row.song_artist}`
      : null

    const svg = await satori(card(haiku, songLine), {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'Inter', data: fontBold,    weight: 700, style: 'normal' },
        { name: 'Inter', data: fontItalic,  weight: 400, style: 'italic' },
      ],
    })

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    const png = resvg.render().asPng()

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('OG image error:', err)
    return new Response('Error generating image', { status: 500 })
  }
}

// ── Card layout ──────────────────────────────────────────────────────────────

function card(haiku, songLine) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        background: 'linear-gradient(135deg, #0d0d1a 0%, #141428 50%, #0d0d1a 100%)',
        padding: '64px 80px',
        fontFamily: 'Inter',
        position: 'relative',
      },
      children: [

        // Top bar: brand left, subtle rule right
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0px',
            },
            children: [
              // Brand
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: '22px',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          color: '#635bff',
                        },
                        children: 'Lyric',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: '22px',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          color: 'rgba(255,255,255,0.9)',
                        },
                        children: 'Haiku',
                      },
                    },
                  ],
                },
              },
              // URL
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '15px',
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.04em',
                  },
                  children: 'lyric-haiku.com',
                },
              },
            ],
          },
        },

        // Spacer
        { type: 'div', props: { style: { flex: 1 }, children: '' } },

        // Haiku lines
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginBottom: songLine ? '52px' : '0px',
            },
            children: haiku.map((line, i) => ({
              type: 'div',
              props: {
                style: {
                  fontSize: haiku.some(l => l.length > 40) ? '38px' : '44px',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: i === 1
                    ? 'rgba(255,255,255,1)'
                    : 'rgba(255,255,255,0.75)',
                  letterSpacing: '-0.01em',
                  lineHeight: '1.25',
                },
                children: line,
              },
            })),
          },
        },

        // Song credit
        songLine
          ? {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        width: '32px',
                        height: '2px',
                        background: '#635bff',
                        borderRadius: '1px',
                        flexShrink: 0,
                      },
                      children: '',
                    },
                  },
                  {
                    type: 'span',
                    props: {
                      style: {
                        fontSize: '18px',
                        color: 'rgba(255,255,255,0.45)',
                        letterSpacing: '0.01em',
                      },
                      children: songLine,
                    },
                  },
                ],
              },
            }
          : { type: 'div', props: { style: {}, children: '' } },

      ],
    },
  }
}
