"""
Database connection helper.
Uses psycopg2 to connect directly to Supabase PostgreSQL.
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

_PATHS_TO_TRY = [
    # Local development / sibling of backend
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "configs", "production.json"),
    # Inside Docker / subdirectory of working dir
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "configs", "production.json"),
    # Working directory fallback
    os.path.join(os.getcwd(), "configs", "production.json"),
]

_CONFIG_PATH = None
for p in _PATHS_TO_TRY:
    if os.path.exists(p):
        _CONFIG_PATH = p
        break

if not _CONFIG_PATH:
    _CONFIG_PATH = _PATHS_TO_TRY[0]


def _load_database_url() -> str:
    
    with open(_CONFIG_PATH, "r") as f:
        cfg = json.load(f)
    return cfg["DATABASE_URL"]


DATABASE_URL = _load_database_url()


def get_connection():
    """Return a new psycopg2 connection with RealDictCursor factory."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def query(sql: str, params: tuple = None, fetch: bool = True):
    """Execute a query and optionally return rows."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if fetch:
                rows = cur.fetchall()
            else:
                rows = None
            conn.commit()
            return rows
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query_one(sql: str, params: tuple = None):
    """Execute a query and return a single row."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            conn.commit()
            return row
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
