"""
Background scheduler that pings all active resources every 5 minutes.
Exposes `ping_resource()` for manual/on-demand pings from the API.
"""
import json
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from db import query, query_one
from pinger import postgres_ping, mongodb_ping, mysql_ping, redis_ping, http_ping
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Global scheduler reference to read next run times
scheduler_instance = None
PINGER_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pinger.json")


def write_pinger_json(next_run_time=None):
    if not next_run_time:
        next_run_time = datetime.now() + timedelta(minutes=5)
    
    iso_time = next_run_time.isoformat() if hasattr(next_run_time, "isoformat") else str(next_run_time)
    try:
        with open(PINGER_JSON_PATH, "w") as f:
            json.dump({"next_ping_at": iso_time}, f)
        logger.info(f"Updated next ping schedule to {iso_time}")
    except Exception as e:
        logger.error(f"Failed to write next ping schedule: {e}")


def update_pinger_json():
    global scheduler_instance
    if scheduler_instance:
        job = scheduler_instance.get_job("ping_all_resources")
        if job and job.next_run_time:
            write_pinger_json(job.next_run_time)
            return
    write_pinger_json()



# Map action names → pinger modules
PINGERS = {
    "postgres_ping": postgres_ping,
    "mongodb_ping": mongodb_ping,
    "mysql_ping": mysql_ping,
    "redis_ping": redis_ping,
    "http_ping": http_ping,
}


def ping_resource(resource: dict) -> dict:
    """
    Ping a single resource and persist the result to ping_history.

    Args:
        resource: A dict-like row from the `resources` table.

    Returns:
        dict with keys: id, resource_id, status, response_time_ms,
        query_result, error_message, created_at.
    """
    action = resource.get("action")
    pinger = PINGERS.get(action)

    if not pinger:
        logger.warning(f"Unknown action '{action}' for resource '{resource['name']}'")
        return {
            "status": "failed",
            "response_time_ms": 0,
            "query_result": None,
            "error_message": f"Unknown action type: {action}",
        }

    config = resource.get("config", {})
    query_str = resource.get("query")

    try:
        result = pinger.execute(config, query_str)
    except Exception as e:
        result = {
            "status": "failed",
            "response_time_ms": 0,
            "query_result": None,
            "error_message": f"Pinger exception: {str(e)}",
        }

    # Persist to ping_history and return the full row
    try:
        sql = """
            INSERT INTO ping_history (resource_id, status, response_time_ms, query_result, error_message)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """
        query_result_json = json.dumps(result.get("query_result")) if result.get("query_result") else None
        row = query_one(
            sql,
            (
                str(resource["id"]),
                result["status"],
                result["response_time_ms"],
                query_result_json,
                result.get("error_message"),
            ),
        )
        logger.info(
            f"  ✓ {resource['name']} ({action}): {result['status']} in {result['response_time_ms']}ms"
        )
        # Return serialised history row
        if row:
            d = dict(row)
            d["id"] = str(d["id"])
            d["resource_id"] = str(d["resource_id"])
            d["created_at"] = d["created_at"].isoformat() if d.get("created_at") else None
            return d
        return result
    except Exception as e:
        logger.error(f"  ✗ Failed to save ping result for '{resource['name']}': {e}")
        return result


def ping_all_resources():
    """Iterate over all active resources and ping them."""
    logger.info("Scheduler: Starting ping cycle...")
    try:
        resources = query("SELECT * FROM resources WHERE is_active = true")
    except Exception as e:
        logger.error(f"Scheduler: Failed to fetch resources: {e}")
        return

    for resource in resources:
        ping_resource(resource)

    update_pinger_json()


def start_scheduler(app):
    """Start the APScheduler background job."""
    global scheduler_instance
    scheduler_instance = BackgroundScheduler()
    scheduler_instance.add_job(
        func=ping_all_resources,
        trigger="interval",
        minutes=5,
        id="ping_all_resources",
        replace_existing=True,
    )
    scheduler_instance.start()
    logger.info("Background scheduler started — pinging every 5 minutes.")
    update_pinger_json()
