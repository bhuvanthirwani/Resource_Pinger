"""
Ping History API routes.
"""
from flask import Blueprint, request, jsonify
from db import query

ping_history_bp = Blueprint("ping_history", __name__)


@ping_history_bp.route("/ping-history", methods=["GET"])
def list_ping_history():
    """
    Fetch ping history logs.
    Supports:
      ?resource_id=UUID   — filter by resource
      ?limit=N            — number of rows (default 100)
      ?offset=N           — pagination offset (default 0)
    """
    resource_id = request.args.get("resource_id")
    limit = request.args.get("limit", 100, type=int)
    offset = request.args.get("offset", 0, type=int)

    if resource_id:
        sql = """
            SELECT ph.*, r.name AS resource_name, r.action AS resource_action
            FROM ping_history ph
            JOIN resources r ON r.id = ph.resource_id
            WHERE ph.resource_id = %s
            ORDER BY ph.created_at DESC
            LIMIT %s OFFSET %s
        """
        rows = query(sql, (resource_id, limit, offset))
    else:
        sql = """
            SELECT ph.*, r.name AS resource_name, r.action AS resource_action
            FROM ping_history ph
            JOIN resources r ON r.id = ph.resource_id
            ORDER BY ph.created_at DESC
            LIMIT %s OFFSET %s
        """
        rows = query(sql, (limit, offset))

    results = []
    for row in rows:
        d = dict(row)
        d["id"] = str(d["id"])
        d["resource_id"] = str(d["resource_id"])
        d["created_at"] = d["created_at"].isoformat() if d.get("created_at") else None
        results.append(d)

    return jsonify(results), 200


@ping_history_bp.route("/ping-history/stats", methods=["GET"])
def get_ping_stats():
    """Return aggregated ping statistics for the dashboard."""
    sql = """
        SELECT 
            COUNT(*) AS total_count,
            COUNT(CASE WHEN status = 'success' THEN 1 END) AS success_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_count,
            ROUND(AVG(response_time_ms)) AS avg_response_time
        FROM ping_history
    """
    rows = query(sql)
    if rows:
        row = rows[0]
        return jsonify({
            "total": row["total_count"] or 0,
            "success": row["success_count"] or 0,
            "failed": row["failed_count"] or 0,
            "avgResponse": int(row["avg_response_time"] or 0)
        }), 200
    return jsonify({
        "total": 0,
        "success": 0,
        "failed": 0,
        "avgResponse": 0
    }), 200
