// POST /api/admin/login - Authenticate admin user

function generateToken() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function onRequestPost(context) {
  const { env, request } = context

  try {
    const { password } = await request.json()

    if (!password || password !== env.ADMIN_PASSWORD) {
      return Response.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = generateToken()

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Set-Cookie': `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return Response.json({ error: 'Login failed' }, { status: 500 })
  }
}

// GET /api/admin/login - Check if authenticated
export async function onRequestGet(context) {
  const { env, request } = context

  const cookie = request.headers.get('Cookie') || ''
  const hasSession = cookie.includes('admin_session=')

  return Response.json({ authenticated: hasSession })
}

// POST /api/admin/login with action=logout - Clear session
export async function onRequestDelete() {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Set-Cookie': 'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      'Content-Type': 'application/json'
    }
  })
}
