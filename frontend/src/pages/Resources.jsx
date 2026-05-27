import { useState, useEffect, useCallback } from 'react';
import SearchBar from '../components/SearchBar';
import ResourceTable from '../components/ResourceTable';
import ResourceModal from '../components/ResourceModal';
import { fetchResources, createResource, updateResource, deleteResource, pingResource, fetchNextPing, pingAllResources } from '../api';
import { useToast } from '../components/Toast';

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editResource, setEditResource] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pingingIds, setPingingIds] = useState(new Set());
  const [nextPing, setNextPing] = useState(null);
  const [loadingNext, setLoadingNext] = useState(true);
  const [pingingAll, setPingingAll] = useState(false);
  const toast = useToast();

  const loadNextPing = useCallback(async () => {
    try {
      const data = await fetchNextPing();
      setNextPing(data?.next_ping_at || null);
    } catch (err) {
      console.error('Failed to load next ping time:', err);
    } finally {
      setLoadingNext(false);
    }
  }, []);

  useEffect(() => {
    loadNextPing();
  }, [loadNextPing]);

  const loadResources = useCallback(async (searchTerm = '') => {
    setLoading(true);
    try {
      const data = await fetchResources(searchTerm);
      setResources(data);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadResources(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadResources]);

  function handleAdd() {
    setEditResource(null);
    setModalOpen(true);
  }

  function handleEdit(resource) {
    setEditResource(resource);
    setModalOpen(true);
  }

  async function handleSave(data) {
    try {
      if (editResource?.id) {
        await updateResource(editResource.id, data);
        toast('Resource updated successfully', 'success');
      } else {
        await createResource(data);
        toast('Resource created successfully', 'success');
      }
      setModalOpen(false);
      setEditResource(null);
      loadResources(search);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function handleDeleteClick(resource) {
    setDeleteTarget(resource);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteResource(deleteTarget.id);
      toast('Resource deactivated', 'success');
      setDeleteTarget(null);
      loadResources(search);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handlePing(id) {
    // Add to pinging set
    setPingingIds((prev) => new Set(prev).add(id));
    try {
      const result = await pingResource(id);
      // Update the resource in-place with new ping data
      setResources((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                last_ping_status: result.status,
                last_ping_response_time: result.response_time_ms,
                last_ping_error: result.error_message,
                last_ping_at: result.created_at,
              }
            : r
        )
      );
      if (result.status === 'success') {
        toast(`✓ Ping successful — ${result.response_time_ms}ms`, 'success');
      } else {
        toast(`✗ Ping failed — ${result.error_message || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      toast(`Ping error: ${err.message}`, 'error');
    } finally {
      setPingingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handlePingAll() {
    setPingingAll(true);
    try {
      await pingAllResources();
      toast('✓ All active resources pinged successfully!', 'success');
      await Promise.all([
        loadResources(search),
        loadNextPing()
      ]);
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
          <h2>Resources</h2>
          <p>Manage your monitored resources — databases, APIs, and services.</p>
        </div>
        {!loadingNext && nextPing && (
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

      {/* Toolbar */}
      <div className="table-wrapper">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search resources by name..."
          />
          <button className="btn btn-primary" onClick={handleAdd}>
            ＋ Add Resource
          </button>
        </div>

        {/* Table */}
        <ResourceTable
          resources={resources}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onPing={handlePing}
          pingingIds={pingingIds}
        />
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ResourceModal
          resource={editResource}
          onClose={() => {
            setModalOpen(false);
            setEditResource(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-body">
              <div className="confirm-dialog">
                <div className="confirm-icon">⚠️</div>
                <h3>Deactivate Resource?</h3>
                <p>
                  <strong>{deleteTarget.name}</strong> will be soft-deleted and no longer pinged.
                  This can be undone from the database.
                </p>
                <div className="confirm-actions">
                  <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={confirmDelete}>
                    🗑️ Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
