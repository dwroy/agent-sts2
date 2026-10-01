#!/usr/bin/env python3
"""Read-only SQL over the log database (docs/logdb.md).

  query.py "SELECT ..."            one statement (SELECT / WITH / FROM / DESCRIBE / SUMMARIZE / EXPLAIN), markdown table
  query.py --json "SELECT ..."     {"columns", "types", "rows", "row_count", "truncated", "ms"} (errors: {"error"})
  query.py --schema                the tables and views with their columns
  query.py --raw states 123456     the raw JSONL line at that byte offset (state_index.off, decisions.off, ...)

By default an incremental sync runs first (tools/logdb/sync.py; skipped when another sync holds the lock);
--no-sync queries what is already there. At most --max-rows rows are returned (default 200; `truncated`
says whether there were more) and a query is interrupted after --timeout seconds (default 30).

Only one read-only statement is accepted, and the connection cannot read or write files outside the
database directory (DuckDB enable_external_access = false with allowed_directories = [database]).
Run with .cache/logdb-venv/bin/python (needs duckdb).
"""
import argparse
import datetime
import decimal
import json
import os
import sys
import threading
import time
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import extract  # noqa: E402
import sync as logsync  # noqa: E402

DEFAULT_MAX_ROWS = 200
DEFAULT_TIMEOUT = 30.0
CELL_CAP = 300
# The views a query is expected to use, in the order --schema prints them (helpers follow).
MAIN_VIEWS = ["runs", "floors", "fights", "turns", "decisions", "llm_calls", "run_plans", "run_config", "sl_attempts", "state_index", "frames"]
ALLOWED = {"SELECT", "EXPLAIN"}


class QueryError(Exception):
    def __init__(self, message, code=1):
        super().__init__(message)
        self.code = code


def connect(db, threads=4):
    """An in-memory DuckDB with the views over `db`, then locked down: no file access outside `db`, no
    extension loading, no configuration changes."""
    import duckdb

    if not os.path.exists(os.path.join(db, "manifest.json")):
        raise QueryError(f"no log database at {db}: run tools/logdb/sync.py first")
    missing = [t for t in extract.TABLES if not os.path.exists(os.path.join(db, t, logsync.EMPTY))]
    if missing:
        # A table added after the database was last synced (its zero-row shard is written by the next sync).
        raise QueryError(f"the log database at {db} has no {', '.join(missing)} yet: run tools/logdb/sync.py once")
    con = duckdb.connect(config={"threads": threads})
    with open(os.path.join(HERE, "views.sql"), encoding="utf8") as handle:
        views = handle.read().replace("${DB}", db.replace("'", "''"))
    con.execute(views)
    con.execute("SET autoinstall_known_extensions = false")
    con.execute("SET autoload_known_extensions = false")
    con.execute(f"SET allowed_directories = ['{db.replace(chr(39), chr(39) * 2)}/']")
    con.execute("SET enable_external_access = false")
    con.execute("SET lock_configuration = true")
    return con


def check_sql(con, sql):
    """The one statement in `sql`, if it is read-only; else QueryError(code 2)."""
    try:
        statements = con.extract_statements(sql)
    except Exception as caught:  # parser errors come as several duckdb exception types
        raise QueryError(f"SQL parse error: {caught}", 2)
    if len(statements) != 1:
        raise QueryError(f"exactly one statement is allowed, got {len(statements)}", 2)
    kind = statements[0].type.name
    if kind not in ALLOWED:
        raise QueryError(f"read-only queries only (SELECT / WITH / DESCRIBE / EXPLAIN); got a {kind} statement", 2)
    return sql


def plain(value):
    """A JSON-safe value (timestamps as ISO strings, decimals as floats, structs and lists kept)."""
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if isinstance(value, datetime.timedelta):
        return value.total_seconds()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, bytes):
        return value.hex()
    if isinstance(value, float):
        return value if value == value and value not in (float("inf"), float("-inf")) else None
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    return value


def run_query(con, sql, max_rows=DEFAULT_MAX_ROWS, timeout=DEFAULT_TIMEOUT):
    check_sql(con, sql)
    timer = threading.Timer(timeout, con.interrupt)
    started = time.time()
    timer.start()
    try:
        con.execute(sql)
        columns = [d[0] for d in con.description or []]
        types = [str(d[1]) for d in con.description or []]
        rows = con.fetchmany(max_rows + 1)
    except Exception as caught:
        if time.time() - started >= timeout - 0.05:
            raise QueryError(f"query interrupted after {timeout:g} s (add filters or LIMIT)")
        raise QueryError(f"{type(caught).__name__}: {caught}")
    finally:
        timer.cancel()
    truncated = len(rows) > max_rows
    rows = [[plain(v) for v in row] for row in rows[:max_rows]]
    return {"columns": columns, "types": types, "rows": rows, "row_count": len(rows), "truncated": truncated,
            "ms": round((time.time() - started) * 1000)}


def cell(value):
    if value is None:
        return ""
    if isinstance(value, float):
        text = f"{value:.4f}".rstrip("0").rstrip(".") if value != int(value) or abs(value) >= 1e15 else str(int(value))
    elif isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    else:
        text = str(value)
    text = text.replace("|", "\\|").replace("\n", " ")
    return text if len(text) <= CELL_CAP else text[: CELL_CAP - 1] + "…"


def markdown(result):
    lines = ["| " + " | ".join(result["columns"]) + " |", "|" + "---|" * len(result["columns"])]
    lines += ["| " + " | ".join(cell(v) for v in row) + " |" for row in result["rows"]]
    more = f"; truncated at {result['row_count']} rows" if result["truncated"] else ""
    lines.append(f"({result['row_count']} rows, {result['ms']} ms{more})")
    return "\n".join(lines)


def schema(con):
    """{view: [(column, type)]} for the main views, then the helper views."""
    names = [r[0] for r in con.execute("SELECT view_name FROM duckdb_views() WHERE NOT internal ORDER BY view_name").fetchall()]
    ordered = [n for n in MAIN_VIEWS if n in names] + [n for n in names if n not in MAIN_VIEWS]
    out = {}
    for name in ordered:
        out[name] = [(r[0], r[1]) for r in con.execute(f'DESCRIBE "{name}"').fetchall()]
    return out


def raw_line(logs, source, off):
    """The raw line of a source file at a byte offset that starts a line."""
    files = {key: spec[0] for key, spec in extract.SOURCES.items()}
    if source not in files:
        raise QueryError(f"unknown source {source!r}; one of {', '.join(files)}", 2)
    path = os.path.join(logs, files[source])
    with open(path, "rb") as handle:
        if off > 0:
            handle.seek(off - 1)
            if handle.read(1) != b"\n":
                raise QueryError(f"offset {off} is not the start of a line in {path}", 2)
        else:
            handle.seek(0)
        line = handle.readline()
    if not line:
        raise QueryError(f"offset {off} is past the end of {path}", 2)
    return line.decode("utf8", "replace").rstrip("\n")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sql", nargs="?")
    parser.add_argument("--db", default=os.environ.get("LOGDB_DIR", logsync.DEFAULT_DB))
    parser.add_argument("--logs", default=os.environ.get("LOGDB_LOGS", logsync.DEFAULT_LOGS))
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--no-sync", action="store_true")
    parser.add_argument("--max-rows", type=int, default=DEFAULT_MAX_ROWS)
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT)
    parser.add_argument("--schema", action="store_true")
    parser.add_argument("--raw", nargs=2, metavar=("SOURCE", "OFFSET"))
    args = parser.parse_args(argv)
    db = os.path.abspath(args.db)

    def fail(message, code):
        if args.json:
            print(json.dumps({"error": message}, ensure_ascii=False))
        else:
            print(f"error: {message}", file=sys.stderr)
        return code

    try:
        if args.raw:
            try:
                offset = int(args.raw[1])
            except ValueError:
                raise QueryError(f"offset must be an integer, got {args.raw[1]!r}", 2)
            print(raw_line(os.path.abspath(args.logs), args.raw[0], offset))
            return 0
        if not args.schema and not (args.sql or "").strip():
            raise QueryError("give one SQL statement (or --schema)", 2)
        if args.max_rows < 1:
            raise QueryError("--max-rows must be at least 1", 2)
        if not args.no_sync:
            logsync.be_gentle()
            logsync.sync(os.path.abspath(args.logs), db, quiet=True, wait=False)
        if not os.path.exists(os.path.join(db, "manifest.json")):
            raise QueryError(f"no log database at {db}: run tools/logdb/sync.py first")
        with logsync.read_lock(db, shared=True):
            con = connect(db)
            if args.schema:
                tables = schema(con)
                if args.json:
                    print(json.dumps({name: [{"name": c, "type": t} for c, t in cols] for name, cols in tables.items()}, ensure_ascii=False))
                else:
                    for name, cols in tables.items():
                        print(f"{name}: " + ", ".join(f"{c} {t}" for c, t in cols))
                return 0
            result = run_query(con, args.sql, args.max_rows, args.timeout)
        print(json.dumps(result, ensure_ascii=False) if args.json else markdown(result))
        return 0
    except QueryError as caught:
        return fail(str(caught), caught.code)
    except OSError as caught:
        return fail(str(caught), 1)


if __name__ == "__main__":
    sys.exit(main())
