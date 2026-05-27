"""
Resource CRUD API routes + manual ping trigger.
"""
import json
from urllib.parse import urlparse, unquote
from flask import Blueprint, request, jsonify
from db import query, query_one

resources_bp = Blueprint("resources", __name__)


def parse_db_url(url, action):
    """Parse common database connection strings into standard config parameters."""
    try:
        parsed = urlparse(url)
        if action == "mongodb_ping":
            path = parsed.path.lstrip("/") if parsed.path else ""
            if "?" in path:
                path = path.split("?")[0]
            database = path or "admin"
            return {
                "connection_string": url,
                "database": database
            }

        host = parsed.hostname or ""
        port = parsed.port
        user = parsed.username or ""
        password = parsed.password or ""
        if user:
            user = unquote(user)
        if password:
            password = unquote(password)
            
        path = parsed.path.lstrip("/") if parsed.path else ""
        if "?" in path:
            path = path.split("?")[0]
        database = path
        
        if not port:
            if action == "postgres_ping":
                port = 5432
            elif action == "mysql_ping":
                port = 3306
            elif action == "redis_ping":
                port = 6379
                
        res = {
            "host": host,
            "port": port,
            "password": password
        }
        if action in ("postgres_ping", "mysql_ping"):
            res["user"] = user
            res["database"] = database
            
        return res
    except Exception as e:
        print(f"Error parsing connection URL: {e}")
        return {}




@resources_bp.route("/resources", methods=["GET"])
def list_resources():
    """
    Fetch all active resources with their latest ping status.
    Supports ?search=name query.
    Uses LEFT JOIN LATERAL to efficiently grab each resource's most recent ping.
    """
    search = request.args.get("search", "").strip()

    base_sql = """
        SELECT r.*,
               lp.status          AS last_ping_status,
               lp.response_time_ms AS last_ping_response_time,
               lp.error_message   AS last_ping_error,
               lp.created_at      AS last_ping_at
        FROM resources r
        LEFT JOIN LATERAL (
            SELECT ph.status, ph.response_time_ms, ph.error_message, ph.created_at
            FROM ping_history ph
            WHERE ph.resource_id = r.id
            ORDER BY ph.created_at DESC
            LIMIT 1
        ) lp ON true
        WHERE r.is_active = true
    """

    if search:
        sql = base_sql + " AND r.name ILIKE %s ORDER BY r.created_at DESC"
        rows = query(sql, (f"%{search}%",))
    else:
        sql = base_sql + " ORDER BY r.created_at DESC"
        rows = query(sql)

    results = [_serialize(row) for row in rows]
    return jsonify(results), 200


@resources_bp.route("/resources/<resource_id>", methods=["GET"])
def get_resource(resource_id):
    """Fetch a single resource by ID."""
    sql = "SELECT * FROM resources WHERE id = %s"
    row = query_one(sql, (resource_id,))
    if not row:
        return jsonify({"error": "Resource not found"}), 404
    return jsonify(_serialize(row)), 200


@resources_bp.route("/resources", methods=["POST"])
def create_resource():
    """Create a new resource."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name")
    environment = data.get("environment", "production")
    config = data.get("config", {})
    action = data.get("action")
    qry = data.get("query")

    if not name or not action:
        return jsonify({"error": "name and action are required"}), 400

    # Auto-parse connection string if passed directly in config
    if config and action in ("postgres_ping", "mysql_ping", "redis_ping") and "connection_string" in config:
        parsed = parse_db_url(config["connection_string"], action)
        if parsed:
            config = parsed

    sql = """
        INSERT INTO resources (name, environment, config, action, query)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
    """
    row = query_one(sql, (name, environment, json.dumps(config), action, qry))
    return jsonify(_serialize(row)), 201


@resources_bp.route("/resources/<resource_id>", methods=["PUT"])
def update_resource(resource_id):
    """Update an existing resource."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name")
    environment = data.get("environment")
    config = data.get("config")
    action = data.get("action")
    qry = data.get("query")

    # Auto-parse connection string if passed during update
    if config and "connection_string" in config:
        act = action
        if not act:
            res_sql = "SELECT action FROM resources WHERE id = %s"
            res_row = query_one(res_sql, (resource_id,))
            if res_row:
                act = res_row["action"]
        if act in ("postgres_ping", "mysql_ping", "redis_ping"):
            parsed = parse_db_url(config["connection_string"], act)
            if parsed:
                config = parsed

    sql = """
        UPDATE resources
        SET name        = COALESCE(%s, name),
            environment = COALESCE(%s, environment),
            config      = COALESCE(%s, config),
            action      = COALESCE(%s, action),
            query       = %s
        WHERE id = %s
        RETURNING *
    """
    config_json = json.dumps(config) if config is not None else None
    row = query_one(sql, (name, environment, config_json, action, qry, resource_id))
    if not row:
        return jsonify({"error": "Resource not found"}), 404
    return jsonify(_serialize(row)), 200


@resources_bp.route("/resources/<resource_id>", methods=["DELETE"])
def delete_resource(resource_id):
    """Soft delete a resource (set is_active = false)."""
    sql = """
        UPDATE resources SET is_active = false
        WHERE id = %s
        RETURNING *
    """
    row = query_one(sql, (resource_id,))
    if not row:
        return jsonify({"error": "Resource not found"}), 404
    return jsonify({"message": "Resource deactivated", "id": str(row["id"])}), 200


@resources_bp.route("/resources/<resource_id>/ping", methods=["POST"])
def manual_ping(resource_id):
    """
    Trigger an immediate ping for a single resource.
    Returns the ping result (persisted to ping_history).
    """
    sql = "SELECT * FROM resources WHERE id = %s AND is_active = true"
    resource = query_one(sql, (resource_id,))
    if not resource:
        return jsonify({"error": "Resource not found or inactive"}), 404

    from scheduler import ping_resource
    result = ping_resource(resource)
    return jsonify(result), 200


@resources_bp.route("/resources/test", methods=["POST"])
def test_connection():
    """
    Test connectivity for a resource configuration in real-time.
    Supports either connection string or raw config parameters.
    Returns results and auto-parsed fields if a connection string is supplied.
    """
    data = request.get_json() or {}
    action = data.get("action")
    connection_string = data.get("connection_string", "").strip()
    config = data.get("config") or {}
    query_str = data.get("query")

    if not action:
        return jsonify({"error": "action is required"}), 400

    parsed_config = {}
    if connection_string:
        parsed_config = parse_db_url(connection_string, action)
        active_config = parsed_config
    else:
        active_config = config

    from scheduler import PINGERS
    pinger = PINGERS.get(action)
    if not pinger:
        return jsonify({"error": f"Unsupported action type: {action}"}), 400

    try:
        result = pinger.execute(active_config, query_str)
    except Exception as e:
        result = {
            "status": "failed",
            "response_time_ms": 0,
            "error_message": str(e),
        }

    response = {
        "status": result.get("status"),
        "response_time_ms": result.get("response_time_ms", 0),
        "error_message": result.get("error_message"),
        "query_result": result.get("query_result"),
    }
    if parsed_config:
        response["parsed_config"] = parsed_config

    return jsonify(response), 200


@resources_bp.route("/scheduler/next-ping", methods=["GET"])
def get_next_ping():
    """Read the next scheduled ping timestamp from local pinger.json."""
    import os
    import json
    from datetime import datetime, timedelta

    pinger_json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pinger.json"
    )

    if not os.path.exists(pinger_json_path):
        # Fallback if scheduler has not written to JSON yet
        next_time = (datetime.now() + timedelta(minutes=5)).isoformat()
        return jsonify({"next_ping_at": next_time}), 200

    try:
        with open(pinger_json_path, "r") as f:
            data = json.load(f)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resources_bp.route("/scheduler/ping-all", methods=["POST"])
def trigger_ping_all():
    """Manually trigger a ping cycle for all active resources."""
    from scheduler import ping_all_resources
    ping_all_resources()
    return jsonify({"status": "success", "message": "All active resources pinged successfully"}), 200


def _serialize(row):
    """Convert a database row dict to JSON-safe format."""
    d = dict(row)
    d["id"] = str(d["id"])
    d["created_at"] = d["created_at"].isoformat() if d.get("created_at") else None
    # Serialize lateral-join timestamp if present
    if d.get("last_ping_at"):
        d["last_ping_at"] = d["last_ping_at"].isoformat()
    # config is already a dict from RealDictCursor with JSONB
    return d
