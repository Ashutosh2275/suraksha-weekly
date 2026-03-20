"""
Root conftest — sets up sys.path so all tests can import from services/api.
"""
import os
import sys

# ── Path setup ────────────────────────────────────────────────────────────────
# services/api/ must be first on sys.path so that `from models import Worker`
# (and every other bare import used inside the API) resolves correctly.
API_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "api"))
POLLER_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "trigger-poller"))

if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)
if POLLER_ROOT not in sys.path:
    sys.path.insert(1, POLLER_ROOT)
