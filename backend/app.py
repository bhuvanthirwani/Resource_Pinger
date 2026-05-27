"""
Flask application factory for Resource Pinger.
"""
from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ---- Register Blueprints ----
    from routes.resources import resources_bp
    from routes.ping_history import ping_history_bp

    app.register_blueprint(resources_bp, url_prefix="/api")
    app.register_blueprint(ping_history_bp, url_prefix="/api")

    # ---- Health Check ----
    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    # ---- Start Background Scheduler ----
    from scheduler import start_scheduler
    start_scheduler(app)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
