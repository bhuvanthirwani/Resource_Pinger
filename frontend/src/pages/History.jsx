import { useState, useEffect } from 'react';
import HistoryTable from '../components/HistoryTable';
import SearchBar from '../components/SearchBar';
import { fetchPingHistory, fetchResources } from '../api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState('');
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchResources().then(setResources).catch(console.error);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [selectedResource, offset]);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await fetchPingHistory({
        resourceId: selectedResource || undefined,
        limit,
        offset,
      });
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header">
        <h2>Ping History</h2>
        <p>Detailed log of every ping attempt and its results.</p>
      </div>

      {/* Filters */}
      <div className="table-wrapper">
        <div className="table-toolbar">
          <div className="flex items-center gap-16" style={{ flexWrap: 'wrap' }}>
            {/* Resource filter */}
            <div>
              <select
                className="form-control"
                style={{ minWidth: '200px' }}
                value={selectedResource}
                onChange={(e) => {
                  setSelectedResource(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">All Resources</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => loadHistory()}
          >
            🔄 Refresh
          </button>
        </div>

        <HistoryTable history={history} loading={loading} />

        {/* Pagination */}
        <div className="pagination">
          <span>
            Showing {history.length} records {offset > 0 && `(offset: ${offset})`}
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              ← Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={history.length < limit}
              onClick={() => setOffset(offset + limit)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
