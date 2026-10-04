"""Shared paths for the ops scripts (agent-sts2 layout, 2026-10-04; docs/layout.md).

ROOT is the project's main checkout (this file's parent); play runs from the live worktree under .worktrees/.
"""
import os

OPS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(OPS)
LOGS = os.path.join(ROOT, "logs")
DATA = os.path.join(ROOT, "data")
NOTES = os.path.join(ROOT, "notes")
LIVE = os.environ.get("STS2_LIVE", os.path.join(ROOT, ".worktrees", "live"))
