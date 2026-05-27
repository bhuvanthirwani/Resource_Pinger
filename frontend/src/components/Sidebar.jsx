import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <h1>
            <span className="brand-icon">⚡</span>
            Resource Pinger
          </h1>
          <p>Infrastructure Monitor</p>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="link-icon">📊</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/resources"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="link-icon">🗄️</span>
            Resources
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="link-icon">📜</span>
            Ping History
          </NavLink>
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)'
        }}>
          v1.0.0 • Resource Pinger
        </div>
      </aside>
    </>
  );
}
