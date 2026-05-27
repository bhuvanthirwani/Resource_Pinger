"""
MySQL ping executor.
Connects via pymysql, optionally runs a validation query.
"""
import time
import pymysql


def execute(config: dict, query_str: str = None) -> dict:
    """
    Ping a MySQL database.

    Args:
        config: dict with keys: host, port, user, password, database
        query_str: optional SQL query (e.g., "SHOW TABLES;")

    Returns:
        dict with status, response_time_ms, query_result, error_message
    """
    start = time.time()
    try:
        conn = pymysql.connect(
            host=config.get("host"),
            port=config.get("port", 3306),
            user=config.get("user"),
            password=config.get("password"),
            database=config.get("database"),
            connect_timeout=10,
        )
        result = None
        if query_str:
            with conn.cursor(pymysql.cursors.DictCursor) as cur:
                cur.execute(query_str)
                result = cur.fetchall()
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
