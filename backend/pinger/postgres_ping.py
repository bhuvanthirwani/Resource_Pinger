"""
PostgreSQL ping executor.
Connects via psycopg2, optionally runs a validation query.
"""
import time
import psycopg2


def execute(config: dict, query_str: str = None) -> dict:
    """
    Ping a PostgreSQL database.

    Args:
        config: dict with keys: host, port, user, password, database
        query_str: optional SQL query to execute (e.g., "SELECT tablename FROM pg_tables WHERE schemaname='public';")

    Returns:
        dict with status, response_time_ms, query_result, error_message
    """
    start = time.time()
    try:
        conn = psycopg2.connect(
            host=config.get("host"),
            port=config.get("port", 5432),
            user=config.get("user"),
            password=config.get("password"),
            database=config.get("database"),
            connect_timeout=10,
        )
        result = None
        if query_str:
            with conn.cursor() as cur:
                cur.execute(query_str)
                columns = [desc[0] for desc in cur.description] if cur.description else []
                rows = cur.fetchall()
                result = [dict(zip(columns, row)) for row in rows]
        conn.close()
        elapsed = int((time.time() - start) * 1000)
        return {
            "status": "success",
            "response_time_ms": elapsed,
            "query_result": result,
            "error_message": None,
        }
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        return {
            "status": "failed",
            "response_time_ms": elapsed,
            "query_result": None,
            "error_message": str(e),
        }
