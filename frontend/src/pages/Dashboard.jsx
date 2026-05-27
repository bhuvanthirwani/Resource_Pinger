import { useState, useEffect } from 'react';
import { fetchResources, fetchPingHistory, fetchNextPing, pingAllResources, fetchPingStats } from '../api';
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    avgResponse: 0,
  });
  const [recentPings, setRecentPings] = useState([]);
  const [nextPing, setNextPing] = useState(null);
  const [pingingAll, setPingingAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [resources, history, nextPingData, statsData] = await Promise.all([
        fetchResources(),
        fetchPingHistory({ limit: 10 }),
        fetchNextPing(),
        fetchPingStats(),
      ]);

      setStats({
        total: resources.length,
        success: statsData.success,
        failed: statsData.failed,
        avgResponse: statsData.avgResponse,
      });

      setRecentPings(history);
      setNextPing(nextPingData?.next_ping_at || null);
    } catch (err) {
      console.error('Dashboard load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePingAll() {
    setPingingAll(true);
    try {
      await pingAllResources();
      toast('✓ All active resources pinged successfully!', 'success');
      await loadDashboard();
    } catch (err) {
      toast(`✗ Failed to ping resources: ${err.message}`, 'error');
    } finally {
      setPingingAll(false);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your monitored resources and recent activity.</p>
        </div>
        {!loading && nextPing && (
          <div style={{
            background: 'var(--accent-glow)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: 'var(--shadow)',
            animation: 'fadeIn 0.5s ease',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⏰</span>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.8px', marginBottom: '2px' }}>Next Ping Cycle</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {new Date(nextPing).toLocaleTimeString()} ({Math.max(0, Math.round((new Date(nextPing) - new Date()) / 1000 / 60))}m from now)
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePingAll}
              disabled={pingingAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
                background: 'rgba(0, 212, 255, 0.04)',
                fontWeight: 600,
                fontSize: '0.78rem',
              }}
            >
              {pingingAll ? (
                <>
                  <span className="ping-spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
                  Pinging all...
                </>
              ) : (
                '⚡ Ping All Now'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-label">Active Resources</div>
          <div className="stat-value">
            {loading ? '—' : stats.total}
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Successful Pings</div>
          <div className="stat-value">
            {loading ? '—' : stats.success}
          </div>
        </div>
        <div className="stat-card error">
          <div className="stat-label">Failed Pings</div>
          <div className="stat-value">
            {loading ? '—' : stats.failed}
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Avg Response</div>
          <div className="stat-value">
            {loading ? '—' : `${stats.avgResponse}ms`}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>
          Recent Pings
        </h3>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Loading...</p>
        ) : recentPings.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon">📡</div>
            <h3>No pings recorded yet</h3>
            <p>The scheduler will start pinging your resources automatically.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>Response Time</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentPings.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.resource_name}</td>
                    <td>
                      <span className={`badge ${p.status}`}>
                        <span className="badge-dot" />
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: p.response_time_ms < 500
                          ? 'var(--success)'
                          : p.response_time_ms < 2000
                            ? 'var(--warning)'
                            : 'var(--error)'
                      }}>
                        {p.response_time_ms}ms
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
