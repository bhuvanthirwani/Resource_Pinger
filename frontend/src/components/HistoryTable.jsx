import Loader from './Loader';

export default function HistoryTable({ history, loading }) {
  if (loading) {
    return (
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Action</th>
              <th>Status</th>
              <th>Response Time</th>
              <th>Query Result</th>
              <th>Error</th>
              <th>Pinged At</th>
            </tr>
          </thead>
        </table>
        <Loader rows={8} columns={7} />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <h3>No ping history yet</h3>
          <p>History will appear here once the scheduler runs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Action</th>
            <th>Status</th>
            <th>Response Time</th>
            <th>Query Result</th>
            <th>Error</th>
            <th>Pinged At</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td style={{ fontWeight: 600 }}>{h.resource_name}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{h.resource_action}</td>
              <td>
                <span className={`badge ${h.status}`}>
                  <span className="badge-dot" />
                  {h.status}
                </span>
              </td>
              <td>
                <span style={{
                  fontWeight: 600,
                  color: h.response_time_ms < 500 ? 'var(--success)' : h.response_time_ms < 2000 ? 'var(--warning)' : 'var(--error)'
                }}>
                  {h.response_time_ms}ms
                </span>
              </td>
              <td>
                {h.query_result ? (
                  <details style={{ cursor: 'pointer' }}>
                    <summary style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                      View Result
                    </summary>
                    <pre style={{
                      fontSize: '0.75rem',
                      marginTop: '6px',
                      background: 'var(--bg-primary)',
                      padding: '8px',
                      borderRadius: '6px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {typeof h.query_result === 'string'
                        ? h.query_result
                        : JSON.stringify(h.query_result, null, 2)}
                    </pre>
                  </details>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
              <td>
                {h.error_message ? (
                  <span className="truncate" title={h.error_message} style={{ color: 'var(--error)', fontSize: '0.82rem' }}>
                    {h.error_message}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                {new Date(h.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
