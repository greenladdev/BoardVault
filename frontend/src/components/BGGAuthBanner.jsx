import { useState } from 'react';
import { api } from '../api/client';
import './BGGAuthBanner.css';

export default function BGGAuthBanner({ onAuthenticated }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debug, setDebug] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setDebug(null);
    setLoading(true);
    try {
      const result = await api.bgg.login(username, password);
      if (result?.debug) setDebug(result.debug);
      setOpen(false);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
      if (err.debug) setDebug(err.debug);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="auth-banner">
        <span className="auth-banner-icon">⚠️</span>
        <span className="auth-banner-text">
          BoardGameGeek requires login to search for games.
        </span>
        <button className="auth-banner-btn" onClick={() => setOpen(true)}>
          Connect BGG Account
        </button>
      </div>
    );
  }

  return (
    <div className="auth-banner auth-banner-expanded">
      <div className="auth-form-header">
        <span className="auth-banner-icon">🎲</span>
        <div>
          <strong>Connect your BGG Account</strong>
          <p className="auth-form-hint">
            Your credentials are sent only to BGG and never stored on disk.
          </p>
        </div>
        <button className="auth-close" onClick={() => setOpen(false)}>✕</button>
      </div>
      <form onSubmit={handleLogin} className="auth-form">
        <input
          type="text"
          placeholder="BGG Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="auth-input"
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder="BGG Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
          autoComplete="current-password"
          required
        />
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Connecting…' : 'Connect'}
        </button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      {debug && (
        <details className="auth-debug">
          <summary>Debug info (cookies BGG returned)</summary>
          <pre>{JSON.stringify(debug, null, 2)}</pre>
        </details>
      )}
      <p className="auth-alt-hint">
        Or set <code>BGG_USERNAME</code> / <code>BGG_PASSWORD</code> in <code>backend/.env</code> to auto-login on startup.
      </p>
    </div>
  );
}
