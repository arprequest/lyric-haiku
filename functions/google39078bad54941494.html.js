export async function onRequestGet() {
  return new Response('google-site-verification: google39078bad54941494.html', {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}
