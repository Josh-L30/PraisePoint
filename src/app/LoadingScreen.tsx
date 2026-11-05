import { BrandMark } from '../components/BrandMark';
export function LoadingScreen() {
  return (
    <main className="loading-screen" aria-busy="true">
      <div className="loading-content">
        <span className="loading-mark">
          <BrandMark />
        </span>
        <h1>Preparing PraisePoint.</h1>
        <p role="status">Opening your workspace…</p>
        <div className="loading-track" aria-hidden="true">
          <span />
        </div>
      </div>
    </main>
  );
}
