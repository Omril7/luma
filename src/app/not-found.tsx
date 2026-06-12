// App Router 404 — prevents Next.js from generating the legacy pages-router /404
export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
        <p>Page not found</p>
      </div>
    </div>
  )
}
