"""
MongoDB ping executor.
Connects via pymongo, optionally lists collections or runs a command.
"""
import time
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure


def execute(config: dict, query_str: str = None) -> dict:
    """
    Ping a MongoDB instance.

    Args:
        config: dict with key: connection_string
        query_str: optional — if set to "db.getCollectionNames()" or similar,
                   will list collections from the default database.

    Returns:
        dict with status, response_time_ms, query_result, error_message
    """
    start = time.time()
    try:
        client = MongoClient(
            config.get("connection_string"),
            serverSelectionTimeoutMS=10000,
        )
        # Force a connection check
        client.admin.command("ping")

        result = None
        if query_str:
            db_name = config.get("database", "admin")
            db = client[db_name]
            # Simple collection listing support
            if "getCollectionNames" in query_str or "list_collections" in query_str:
                result = db.list_collection_names()
            else:
                # Try to run as a command
                result = db.command(query_str)

        client.close()
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
