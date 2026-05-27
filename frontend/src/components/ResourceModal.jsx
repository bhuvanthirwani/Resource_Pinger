import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { testConnection } from '../api';

const ACTIONS = [
  { value: 'postgres_ping', label: '🐘 PostgreSQL' },
  { value: 'mongodb_ping', label: '🍃 MongoDB' },
  { value: 'mysql_ping', label: '🐬 MySQL' },
  { value: 'redis_ping', label: '🔴 Redis' },
  { value: 'http_ping', label: '🌐 HTTP Endpoint' },
];

const ENVIRONMENTS = ['production', 'staging', 'development', 'testing'];

const SAMPLE_QUERIES = {
  postgres_ping: "SELECT tablename FROM pg_tables WHERE schemaname = 'public';",
  mongodb_ping: 'db.getCollectionNames()',
  mysql_ping: 'SHOW TABLES;',
  redis_ping: 'INFO',
  http_ping: '',
};

const DEFAULT_CONFIGS = {
  postgres_ping: {
    inputMode: 'string', // 'string' | 'fields'
    connectionString: '',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'postgres',
  },
  mysql_ping: {
    inputMode: 'string', // 'string' | 'fields'
    connectionString: '',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
  },
  redis_ping: {
    inputMode: 'string', // 'string' | 'fields'
    connectionString: '',
    host: 'localhost',
    port: 6379,
    password: '',
  },
  mongodb_ping: {
    connectionString: 'mongodb://localhost:27017',
    database: 'admin',
  },
  http_ping: {
    url: 'https://',
    timeout: 10,
    headers: '{}',
  },
};

export default function ResourceModal({ resource, onClose, onSave }) {
  const isEdit = !!resource?.id;
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    environment: 'production',
    action: 'postgres_ping',
    config: { ...DEFAULT_CONFIGS.postgres_ping },
    query: '',
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (resource) {
      const action = resource.action || 'postgres_ping';
      let parsedConfig = {};
      try {
        parsedConfig = typeof resource.config === 'string'
          ? JSON.parse(resource.config)
          : (resource.config || {});
      } catch (e) {
        parsedConfig = {};
      }

      const initConfig = { ...DEFAULT_CONFIGS[action] };

      if (action === 'postgres_ping' || action === 'mysql_ping' || action === 'redis_ping') {
        const hasFields = parsedConfig.host || parsedConfig.user || parsedConfig.database;
        initConfig.inputMode = hasFields ? 'fields' : 'string';
        initConfig.connectionString = '';
        initConfig.host = parsedConfig.host || '';
        initConfig.port = parsedConfig.port || DEFAULT_CONFIGS[action].port;
        initConfig.password = parsedConfig.password || '';
        if (action !== 'redis_ping') {
          initConfig.user = parsedConfig.user || '';
          initConfig.database = parsedConfig.database || '';
        }
      } else if (action === 'mongodb_ping') {
        initConfig.connectionString = parsedConfig.connection_string || '';
        initConfig.database = parsedConfig.database || 'admin';
      } else if (action === 'http_ping') {
        initConfig.url = parsedConfig.url || '';
        initConfig.timeout = parsedConfig.timeout || 10;
        initConfig.headers = parsedConfig.headers
          ? (typeof parsedConfig.headers === 'string' ? parsedConfig.headers : JSON.stringify(parsedConfig.headers, null, 2))
          : '{}';
      }

      setForm({
        name: resource.name || '',
        environment: resource.environment || 'production',
        action: action,
        config: initConfig,
        query: resource.query || '',
      });
    } else {
      setForm({
        name: '',
        environment: 'production',
        action: 'postgres_ping',
        config: { ...DEFAULT_CONFIGS.postgres_ping },
        query: '',
      });
    }
    setTestResult(null);
  }, [resource]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleActionChange(newAction) {
    setForm({
      name: form.name,
      environment: form.environment,
      action: newAction,
      config: { ...DEFAULT_CONFIGS[newAction] },
      query: '',
    });
    setTestResult(null);
  }

  function handleConfigChange(field, value) {
    setForm((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
  }

  function insertSampleQuery() {
    handleChange('query', SAMPLE_QUERIES[form.action] || '');
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    const isDB = ['postgres_ping', 'mysql_ping', 'redis_ping'].includes(form.action);
    const payload = {
      action: form.action,
      query: form.query || null,
    };

    if (isDB) {
      if (form.config.inputMode === 'string') {
        payload.connection_string = form.config.connectionString;
      } else {
        payload.config = {
          host: form.config.host,
          port: parseInt(form.config.port, 10) || DEFAULT_CONFIGS[form.action].port,
          password: form.config.password,
        };
        if (form.action !== 'redis_ping') {
          payload.config.user = form.config.user;
          payload.config.database = form.config.database;
        }
      }
    } else if (form.action === 'mongodb_ping') {
      payload.connection_string = form.config.connectionString;
      payload.config = {
        database: form.config.database,
      };
    } else if (form.action === 'http_ping') {
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(form.config.headers || '{}');
      } catch {
        setTestResult({
          type: 'error',
          message: 'Headers must be valid JSON',
        });
        setTesting(false);
        return;
      }
      payload.config = {
        url: form.config.url,
        timeout: parseInt(form.config.timeout, 10) || 10,
        headers: parsedHeaders,
      };
    }

    try {
      const res = await testConnection(payload);
      if (res.status === 'success') {
        setTestResult({
          type: 'success',
          message: `✓ Connection successful! (took ${res.response_time_ms}ms)`,
        });
        toast('✓ Connection test successful!', 'success');

        if (isDB && form.config.inputMode === 'string' && res.parsed_config) {
          const parsed = res.parsed_config;
          setForm((prev) => ({
            ...prev,
            config: {
              ...prev.config,
              inputMode: 'fields',
              host: parsed.host || prev.config.host,
              port: parsed.port || prev.config.port,
              password: parsed.password || prev.config.password,
              user: parsed.user !== undefined ? parsed.user : prev.config.user,
              database: parsed.database !== undefined ? parsed.database : prev.config.database,
            },
          }));
        } else if (form.action === 'mongodb_ping' && res.parsed_config) {
          const parsed = res.parsed_config;
          setForm((prev) => ({
            ...prev,
            config: {
              ...prev.config,
              database: parsed.database || prev.config.database,
            },
          }));
        }
      } else {
        setTestResult({
          type: 'error',
          message: `✗ Connection failed: ${res.error_message || 'Unknown error'}`,
        });
        toast(`✗ Connection test failed!`, 'error');
      }
    } catch (err) {
      setTestResult({
        type: 'error',
        message: `✗ Connection failed: ${err.message}`,
      });
      toast(`✗ Connection test failed: ${err.message}`, 'error');
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      let finalConfig = {};
      const action = form.action;

      if (['postgres_ping', 'mysql_ping', 'redis_ping'].includes(action)) {
        if (form.config.inputMode === 'string') {
          finalConfig = {
            connection_string: form.config.connectionString,
          };
        } else {
          finalConfig = {
            host: form.config.host,
            port: parseInt(form.config.port, 10) || DEFAULT_CONFIGS[action].port,
            password: form.config.password,
          };
          if (action !== 'redis_ping') {
            finalConfig.user = form.config.user;
            finalConfig.database = form.config.database;
          }
        }
      } else if (action === 'mongodb_ping') {
        finalConfig = {
          connection_string: form.config.connectionString,
          database: form.config.database,
        };
      } else if (action === 'http_ping') {
        let headers = {};
        try {
          headers = JSON.parse(form.config.headers || '{}');
        } catch {
          alert('Headers must be valid JSON');
          setSaving(false);
          return;
        }
        finalConfig = {
          url: form.config.url,
          timeout: parseInt(form.config.timeout, 10) || 10,
          headers,
        };
      }

      await onSave({
        name: form.name,
        environment: form.environment,
        action: action,
        config: finalConfig,
        query: form.query || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Resource' : 'Add Resource'}</h3>
          <button className="btn btn-icon" onClick={onClose} disabled={saving || testing}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Name */}
            <div className="form-group">
              <label htmlFor="res-name">Name</label>
              <input
                id="res-name"
                className="form-control"
                placeholder="e.g., Main Production DB"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                disabled={saving || testing}
              />
            </div>

            {/* Environment */}
            <div className="form-group">
              <label htmlFor="res-env">Environment</label>
              <select
                id="res-env"
                className="form-control"
                value={form.environment}
                onChange={(e) => handleChange('environment', e.target.value)}
                disabled={saving || testing}
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div className="form-group">
              <label htmlFor="res-action">Action Type</label>
              <select
                id="res-action"
                className="form-control"
                value={form.action}
                onChange={(e) => handleActionChange(e.target.value)}
                disabled={saving || testing}
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Config Fields */}
            <div style={{ marginBottom: '24px' }}>
              {['postgres_ping', 'mysql_ping', 'redis_ping'].includes(form.action) && (
                <div>
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={`toggle-btn ${form.config.inputMode === 'string' ? 'active' : ''}`}
                      onClick={() => handleConfigChange('inputMode', 'string')}
                      disabled={saving || testing}
                    >
                      🔗 Connection String
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${form.config.inputMode === 'fields' ? 'active' : ''}`}
                      onClick={() => handleConfigChange('inputMode', 'fields')}
                      disabled={saving || testing}
                    >
                      📝 Individual Fields
                    </button>
                  </div>

                  {form.config.inputMode === 'string' ? (
                    <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                      <label htmlFor="res-conn-string">Connection String</label>
                      <input
                        id="res-conn-string"
                        type="text"
                        className="form-control"
                        placeholder={
                          form.action === 'postgres_ping'
                            ? 'postgresql://username:password@localhost:5432/my_database'
                            : form.action === 'mysql_ping'
                            ? 'mysql://username:password@127.0.0.1:3306/my_database'
                            : 'redis://:authpassword@localhost:6379'
                        }
                        value={form.config.connectionString || ''}
                        onChange={(e) => handleConfigChange('connectionString', e.target.value)}
                        required
                        disabled={saving || testing}
                      />
                    </div>
                  ) : (
                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="res-host">Host</label>
                          <input
                            id="res-host"
                            type="text"
                            className="form-control"
                            placeholder="localhost"
                            value={form.config.host || ''}
                            onChange={(e) => handleConfigChange('host', e.target.value)}
                            required
                            disabled={saving || testing}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="res-port">Port</label>
                          <input
                            id="res-port"
                            type="number"
                            className="form-control"
                            placeholder={DEFAULT_CONFIGS[form.action].port}
                            value={form.config.port || ''}
                            onChange={(e) => handleConfigChange('port', e.target.value)}
                            required
                            disabled={saving || testing}
                          />
                        </div>
                      </div>

                      {form.action !== 'redis_ping' && (
                        <div className="form-row-3">
                          <div className="form-group">
                            <label htmlFor="res-user">User</label>
                            <input
                              id="res-user"
                              type="text"
                              className="form-control"
                              placeholder={form.action === 'postgres_ping' ? 'postgres' : 'root'}
                              value={form.config.user || ''}
                              onChange={(e) => handleConfigChange('user', e.target.value)}
                              required
                              disabled={saving || testing}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="res-pwd">Password</label>
                            <input
                              id="res-pwd"
                              type="password"
                              className="form-control"
                              placeholder="••••••••"
                              value={form.config.password || ''}
                              onChange={(e) => handleConfigChange('password', e.target.value)}
                              disabled={saving || testing}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="res-db">Database</label>
                            <input
                              id="res-db"
                              type="text"
                              className="form-control"
                              placeholder="database_name"
                              value={form.config.database || ''}
                              onChange={(e) => handleConfigChange('database', e.target.value)}
                              required
                              disabled={saving || testing}
                            />
                          </div>
                        </div>
                      )}

                      {form.action === 'redis_ping' && (
                        <div className="form-group">
                          <label htmlFor="res-pwd">Password (Optional)</label>
                          <input
                            id="res-pwd"
                            type="password"
                            className="form-control"
                            placeholder="••••••••"
                            value={form.config.password || ''}
                            onChange={(e) => handleConfigChange('password', e.target.value)}
                            disabled={saving || testing}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {form.action === 'mongodb_ping' && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div className="form-group">
                    <label htmlFor="res-conn-string">MongoDB Connection String</label>
                    <input
                      id="res-conn-string"
                      type="text"
                      className="form-control"
                      placeholder="mongodb://localhost:27017"
                      value={form.config.connectionString || ''}
                      onChange={(e) => handleConfigChange('connectionString', e.target.value)}
                      required
                      disabled={saving || testing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="res-db">Database Name (Optional)</label>
                    <input
                      id="res-db"
                      type="text"
                      className="form-control"
                      placeholder="admin"
                      value={form.config.database || ''}
                      onChange={(e) => handleConfigChange('database', e.target.value)}
                      required
                      disabled={saving || testing}
                    />
                  </div>
                </div>
              )}

              {form.action === 'http_ping' && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div className="form-group">
                    <label htmlFor="res-url">Endpoint URL</label>
                    <input
                      id="res-url"
                      type="url"
                      className="form-control"
                      placeholder="https://api.example.com/health"
                      value={form.config.url || ''}
                      onChange={(e) => handleConfigChange('url', e.target.value)}
                      required
                      disabled={saving || testing}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="res-timeout">Timeout (Seconds)</label>
                      <input
                        id="res-timeout"
                        type="number"
                        className="form-control"
                        placeholder="10"
                        value={form.config.timeout || ''}
                        onChange={(e) => handleConfigChange('timeout', e.target.value)}
                        required
                        disabled={saving || testing}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="res-headers">Custom Headers (JSON)</label>
                    <textarea
                      id="res-headers"
                      className="form-control"
                      placeholder='{ "Authorization": "Bearer token" }'
                      value={form.config.headers || ''}
                      onChange={(e) => handleConfigChange('headers', e.target.value)}
                      rows={3}
                      disabled={saving || testing}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Validation Query */}
            <div className="form-group">
              <div className="label-action-row">
                <label htmlFor="res-query">Validation Query (Optional)</label>
                {SAMPLE_QUERIES[form.action] && (
                  <button
                    type="button"
                    className="btn-link"
                    onClick={insertSampleQuery}
                    disabled={saving || testing}
                  >
                    ✨ Insert Sample Query
                  </button>
                )}
              </div>
              <textarea
                id="res-query"
                className="form-control"
                placeholder={
                  form.action === 'postgres_ping'
                    ? "e.g., SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
                    : form.action === 'mysql_ping'
                    ? "e.g., SHOW TABLES;"
                    : form.action === 'mongodb_ping'
                    ? "e.g., db.getCollectionNames()"
                    : form.action === 'redis_ping'
                    ? "e.g., INFO"
                    : 'Not applicable for HTTP Endpoints'
                }
                value={form.query}
                onChange={(e) => handleChange('query', e.target.value)}
                rows={3}
                disabled={form.action === 'http_ping' || saving || testing}
              />
            </div>

            {/* Test result inline banner */}
            {testResult && (
              <div className={`feedback-banner ${testResult.type}`}>
                <span className="feedback-icon">
                  {testResult.type === 'success' ? '✅' : '❌'}
                </span>
                <div>{testResult.message}</div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={testing || saving}
              style={{ marginRight: 'auto' }}
            >
              {testing ? '⏳ Testing Connection...' : '⚡ Test Connection'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving || testing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || testing}
            >
              {saving ? '⏳ Saving...' : isEdit ? 'Update Resource' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
