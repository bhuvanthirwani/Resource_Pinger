import { useState } from 'react';
import Loader from './Loader';

const ACTION_LABELS = {
  postgres_ping: '🐘 PostgreSQL',
  mongodb_ping: '🍃 MongoDB',
  mysql_ping: '🐬 MySQL',
  redis_ping: '🔴 Redis',
  http_ping: '🌐 HTTP',
};

export default function ResourceTable({ resources, loading, onEdit, onDelete, onPing, pingingIds }) {
  const isPinging = (id) => pingingIds && pingingIds.has(id);
  const [activeQuery, setActiveQuery] = useState(null);

  if (loading) {
    return (
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Environment</th>
              <th>Action Type</th>
              <th>Status</th>
              <th>Response</th>
              <th>Query</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
        </table>
        <Loader rows={6} columns={8} />
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <div className="empty-icon">🗄️</div>
          <h3>No resources found</h3>
          <p>Add a resource to start monitoring.</p>
        </div>
      </div>
    );
  }

  function statusBadge(resource) {
    const status = resource.last_ping_status;
    if (!status) {
      return (
        <span className="badge pending">
          <span className="badge-dot" />
          pending
        </span>
      );
    }
    return (
      <span className={`badge ${status}`}>
        <span className="badge-dot" />
        {status}
      </span>
    );
  }

  function responseTime(resource) {
    if (resource.last_ping_response_time == null) {
      return <span style={{ color: 'var(--text-muted)' }}>Never</span>;
    }
    const ms = resource.last_ping_response_time;
    const color =
      ms < 500 ? 'var(--success)' : ms < 2000 ? 'var(--warning)' : 'var(--error)';
    return <span style={{ fontWeight: 600, color }}>{ms}ms</span>;
  }

  return (
    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Environment</th>
            <th>Action Type</th>
            <th>Status</th>
            <th>Response</th>
            <th>Query</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => (
            <tr key={r.id}>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td>
                <span className={`badge ${r.environment === 'production' ? 'error' : 'warning'}`}>
                  <span className="badge-dot" />
                  {r.environment}
                </span>
              </td>
              <td>{ACTION_LABELS[r.action] || r.action}</td>
              <td>{statusBadge(r)}</td>
              <td>{responseTime(r)}</td>
              <td>
                {r.query ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveQuery(r.query)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    🔍 View Query
                  </button>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {new Date(r.created_at).toLocaleDateString()}
              </td>
              <td>
                <div className="flex gap-8">
                  <button
                    className={`btn btn-icon ping-btn ${isPinging(r.id) ? 'pinging' : ''}`}
                    title="Ping Now"
                    onClick={() => onPing && onPing(r.id)}
                    disabled={isPinging(r.id)}
                  >
                    {isPinging(r.id) ? (
                      <span className="ping-spinner" />
                    ) : (
                      '⚡'
                    )}
                  </button>
                  <button
                    className="btn btn-icon"
                    title="Edit"
                    onClick={() => onEdit(r)}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-icon"
                    title="Delete"
                    onClick={() => onDelete(r)}
                    style={{ color: 'var(--error)' }}
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Query Viewing Modal */}
      {activeQuery && (
        <div className="modal-overlay" onClick={() => setActiveQuery(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Validation Query</h3>
              <button className="btn btn-icon" onClick={() => setActiveQuery(null)}>✕</button>
            </div>
            <div className="modal-body">
              <pre style={{
                background: 'var(--bg-tertiary)',
                padding: '16px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontFamily: 'Courier New, monospace',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {activeQuery}
              </pre>
            </div>
            <div className="modal-footer" style={{ padding: '0 28px 24px' }}>
              <button className="btn btn-secondary" onClick={() => setActiveQuery(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
