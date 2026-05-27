"""
Redis ping executor.
Connects via redis-py, sends PING command.
"""
import time
import redis as redis_lib


def execute(config: dict, query_str: str = None) -> dict:
    """
    Ping a Redis instance.

    Args:
        config: dict with keys: host, port, password (optional)
        query_str: ignored for Redis (always runs PING)

    Returns:
        dict with status, response_time_ms, query_result, error_message
    """
    start = time.time()
    try:
        r = redis_lib.Redis(
            host=config.get("host", "localhost"),
            port=config.get("port", 6379),
            password=config.get("password"),
            socket_connect_timeout=10,
            decode_responses=True,
        )
        pong = r.ping()
        info = None
        if query_str and query_str.strip().upper() == "INFO":
            info = r.info()
        r.close()
        elapsed = int((time.time() - start) * 1000)
        return {
            "status": "success" if pong else "failed",
            "response_time_ms": elapsed,
            "query_result": info,
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
