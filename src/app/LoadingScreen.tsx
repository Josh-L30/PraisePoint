export function LoadingScreen() {
  return <main className="loading-screen" aria-busy="true"><div className="loading-content">
    <span className="brand-cross loading-mark" aria-hidden="true" /><h1>A moment to gather.</h1>
    <p role="status">Opening your workspace…</p><div className="loading-track" aria-hidden="true"><span /></div>
  </div></main>;
}
