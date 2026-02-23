// GET /og/[id] — Dynamic OG image for haiku permalink pages
// Returns a 1200×630 PNG card suitable for Twitter/X, Facebook, iMessage, etc.
//
// CF Pages Functions block dynamic WASM compilation (compileStreaming/instantiateStreaming
// are unavailable; compile/instantiate from buffer are blocked). Static WASM imports
// (resolved at deploy time by wrangler) produce pre-compiled WebAssembly.Module objects
// that can be instantiated with WebAssembly.instantiate(module, imports).

import satori, { init as initSatori } from 'satori'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import yogaModule from '../../node_modules/satori/yoga.wasm'
import resvgModule from '../../node_modules/@resvg/resvg-wasm/index_bg.wasm'

// Required: satori's init() only accepts a pre-compiled WebAssembly.Module
// when in standalone mode. CF Pages blocks dynamic WASM compilation, so
// static imports (which produce pre-compiled Modules) are the only option.
process.env.SATORI_STANDALONE = '1'

// Module-level cache — reused within the same isolate lifetime
let wasmReady = false
let fontRegular = null
let fontBold = null
let fontItalic = null

async function ensureReady() {
  if (wasmReady && fontRegular && fontBold && fontItalic) return

  await Promise.all([
    // Initialize satori's yoga layout engine with pre-compiled WASM module
    initSatori(yogaModule),
    // Initialize resvg SVG renderer with pre-compiled WASM module
    initWasm(resvgModule),
    // Fetch Inter fonts
    fontRegular
      ? Promise.resolve()
      : fetch('https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf')
          .then(r => r.arrayBuffer()).then(buf => { fontRegular = buf }),
    fontBold
      ? Promise.resolve()
      : fetch('https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf')
          .then(r => r.arrayBuffer()).then(buf => { fontBold = buf }),
    fontItalic
      ? Promise.resolve()
      : fetch('https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc2dthjQ.ttf')
          .then(r => r.arrayBuffer()).then(buf => { fontItalic = buf }),
  ])

  wasmReady = true
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
