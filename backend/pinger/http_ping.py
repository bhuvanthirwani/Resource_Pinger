"""
HTTP ping executor.
Sends a GET request to the configured URL and checks the response.
"""
import time
import requests


def execute(config: dict, query_str: str = None) -> dict:
    """
    Ping an HTTP endpoint.

    Args:
        config: dict with key: url (and optional headers)
        query_str: ignored for HTTP pings

    Returns:
        dict with status, response_time_ms, query_result, error_message
    """
    start = time.time()
    try:
        url = config.get("url")
        headers = config.get("headers", {})
        timeout = config.get("timeout", 10)

        resp = requests.get(url, headers=headers, timeout=timeout)
        elapsed = int((time.time() - start) * 1000)

        result = {
            "status_code": resp.status_code,
            "content_length": len(resp.content),
        }

        return {
            "status": "success" if resp.status_code < 400 else "failed",
            "response_time_ms": elapsed,
            "query_result": result,
            "error_message": None if resp.status_code < 400 else f"HTTP {resp.status_code}",
        }
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        return {
            "status": "failed",
            "response_time_ms": elapsed,
            "query_result": None,
            "error_message": str(e),
        }
