# 📡 Resource Pinger

**Resource Pinger** is a full-stack monitoring application that periodically pings your infrastructure resources — databases (PostgreSQL, MySQL, MongoDB, Redis) and HTTP endpoints — and records their health status over time.

Built with a **Flask** REST API backend, a **React + Vite** frontend with a premium dark-themed glassmorphism UI, and a **Supabase PostgreSQL** database for persistent storage.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔄 **Automated Scheduling** | APScheduler pings all active resources every 5 minutes |
| ⚡ **Manual Ping** | Trigger an instant health check on any resource via the UI |
| 🐘 **PostgreSQL Ping** | Connect and optionally run a validation query |
| 🍃 **MongoDB Ping** | Connect via `pymongo`, list collections, or run commands |
| 🐬 **MySQL Ping** | Connect via `pymysql`, optionally execute SQL |
| 🔴 **Redis Ping** | Send `PING` command, optionally retrieve `INFO` |
| 🌐 **HTTP Ping** | `GET` request to any URL with configurable timeout & headers |
| 📊 **Dashboard** | Real-time stats: active resources, success/fail counts, avg response time |
| 📜 **History Logs** | Paginated ping history with expandable query results |
| 🎨 **Premium UI** | Dark glassmorphism theme, micro-animations, responsive sidebar |
| 🐳 **Docker Ready** | `deploy/docker-compose.yml` for one-command deployment |

---

## 🏗️ Architecture

```
Resource_Pinger/
├── backend/
│   ├── app.py                  # Flask application factory
│   ├── db.py                   # PostgreSQL connection helper (psycopg2)
│   ├── scheduler.py            # APScheduler — background ping loop
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile
│   ├── pinger/                 # Ping executors
│   │   ├── postgres_ping.py
│   │   ├── mongodb_ping.py
│   │   ├── mysql_ping.py
│   │   ├── redis_ping.py
│   │   └── http_ping.py
│   └── routes/                 # API route blueprints
│       ├── resources.py        # CRUD + manual ping
│       └── ping_history.py     # History retrieval
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Router + layout
│   │   ├── api.js              # API client functions
│   │   ├── index.css           # Design system (dark theme)
│   │   ├── main.jsx            # React entry point
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ResourceTable.jsx
│   │   │   ├── ResourceModal.jsx
│   │   │   ├── HistoryTable.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── Loader.jsx
│   │   │   └── Toast.jsx
│   │   └── pages/              # Page-level views
│   │       ├── Dashboard.jsx
│   │       ├── Resources.jsx
│   │       └── History.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── configs/
│   └── production.json         # Database connection URL (⚠️ gitignored)
├── schema.sql                  # Database DDL
├── deploy/
│   ├── docker-compose.yml      # Multi-service orchestration
│   ├── docker_manager.sh       # Interactive / CLI Docker script
│   └── nginx.sh                # Nginx & SSL setup script
└── .gitignore
```

---

## 🗄️ Database Schema

The application uses two PostgreSQL tables hosted on **Supabase**:

### `resources`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Auto-generated unique ID |
| `name` | `VARCHAR(255)` | Display name of the resource |
| `environment` | `VARCHAR(50)` | `production`, `staging`, `development`, `testing` |
| `config` | `JSONB` | Connection parameters (host, port, credentials, etc.) |
| `action` | `VARCHAR(100)` | Pinger type: `postgres_ping`, `mongodb_ping`, `mysql_ping`, `redis_ping`, `http_ping` |
| `query` | `TEXT` | Optional validation query to execute after connecting |
| `is_active` | `BOOLEAN` | Soft-delete flag (default `true`) |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

### `ping_history`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Auto-generated unique ID |
| `resource_id` | `UUID` (FK) | References `resources.id` |
| `status` | `VARCHAR(20)` | `success` or `failed` |
| `response_time_ms` | `INTEGER` | Round-trip time in milliseconds |
| `query_result` | `JSONB` | Result of the validation query (if any) |
| `error_message` | `TEXT` | Error details on failure |
| `created_at` | `TIMESTAMPTZ` | Timestamp of the ping |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/resources` | List all active resources (with latest ping status) |
| `GET` | `/api/resources?search=term` | Search resources by name |
| `GET` | `/api/resources/:id` | Get a single resource |
| `POST` | `/api/resources` | Create a new resource |
| `PUT` | `/api/resources/:id` | Update a resource |
| `DELETE` | `/api/resources/:id` | Soft-delete (deactivate) a resource |
| `POST` | `/api/resources/:id/ping` | Manually trigger a ping and return the result |
| `GET` | `/api/ping-history` | List ping history (supports `?resource_id=`, `?limit=`, `?offset=`) |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**
- A **Supabase** project (or any PostgreSQL database)

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd Resource_Pinger
```

Create the configuration file:
```bash
mkdir -p configs
```

Add your database connection string to `configs/production.json`:
```json
{
  "DATABASE_URL": "postgresql://user:password@host:port/database"
}
```

### 2. Initialize the Database

Run the schema in your Supabase SQL Editor or via `psql`:
```bash
psql "$DATABASE_URL" -f schema.sql
```

### 3. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The API will be available at `http://localhost:5000`.

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:5173`.

### 5. Docker (Production)

Run the interactive Docker manager script from the root:
```bash
./deploy/docker_manager.sh
```
Or run docker compose directly from the `deploy` directory:
```bash
cd deploy
docker compose up --build -d
```

- Frontend: `http://localhost:3000` (or `http://localhost:80` via Nginx proxy)
- Backend API: `http://localhost:5000`

---

## ⚙️ Resource Configuration Examples

### PostgreSQL
```json
{
  "host": "db.example.com",
  "port": 5432,
  "user": "postgres",
  "password": "secret",
  "database": "mydb"
}
```
**Query:** `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`

### MongoDB
```json
{
  "connection_string": "mongodb+srv://user:pass@cluster.mongodb.net",
  "database": "admin"
}
```
**Query:** `db.getCollectionNames()`

### MySQL
```json
{
  "host": "mysql.example.com",
  "port": 3306,
  "user": "root",
  "password": "secret",
  "database": "mydb"
}
```
**Query:** `SHOW TABLES;`

### Redis
```json
{
  "host": "redis.example.com",
  "port": 6379,
  "password": "secret"
}
```
**Query:** `INFO`

### HTTP Endpoint
```json
{
  "url": "https://api.example.com/health",
  "timeout": 10,
  "headers": { "Authorization": "Bearer token123" }
}
```

---

## 📄 License

MIT
