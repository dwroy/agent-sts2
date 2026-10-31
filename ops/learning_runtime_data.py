"""Fixed producers publish D1 objects under their own lock, never live-merge.lock.

The control explicitly admits a producer's method fingerprint. Changing its
algorithm/validator requires engineering and a new admitted fingerprint.
"""
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import subprocess

from learning_runtime import capture
from learning_runtime_store import Store, atomic, checked_file, packed, sha

# Exact consumers/files, not a directory-wide knowledge import.
OUTPUTS = {
    "monster-db": ["common/monster-db.json", "common/move-model.json", "characters/{character}/monster-records.json"],
    "card-upgrades": ["common/card-upgrades.json"],
    "outcome": ["characters/{character}/outcome-stats.json"],
    "construction-opportunities": ["characters/{character}/construction-opportunities.json"],
    "room-costs": ["characters/{character}/room-costs.json"],
    "boss-damage": ["characters/{character}/boss-damage.json"],
    "potion-equivalents": ["characters/{character}/potion-equivalents.json"],
    "v6-history": ["characters/{character}/v6-history.json"],
    "fight-value": ["characters/{character}/fight-value.json", "characters/{character}/fight-value-gates.json"],
    "silent-boss-calibration": ["characters/silent/boss-trust.json"],
    "move-model": ["common/move-model.json"],
    "event-pages": ["common/event-pages.json"],
    "opening-value": ["characters/{character}/opening-value.json"],
}


def managed_paths(chosen):
    producers = set(chosen.get("refresh", []))
    if "silent-boss-calibration" in chosen.get("entries", []):
        producers.add("silent-boss-calibration")
    if producers - set(OUTPUTS):
        raise ValueError("unknown fixed-data consumer capability")
    return sorted({name for producer in producers for name in OUTPUTS[producer]})


def launch_selection(root, state_dir=None):
    """A queued/restarted fixed worker keeps the original control contract."""
    path = os.environ.get("STS2_REFRESH_SELECTION_FILE")
    if not path:
        return capture(root, state_dir)
    base = Path(root).resolve()
    selected = Path(path)
    if selected.parent != base / "data/learning-runtime-launches":
        raise ValueError("foreign refresh launch contract")
    raw = checked_file(base, selected)
    if sha(raw) != os.environ.get("STS2_REFRESH_SELECTION_SHA256"):
        raise ValueError("refresh launch contract hash mismatch")
    body = json.loads(raw)
    if body.get("schema") != "fixed-refresh-launch-v1" or body.get("root") != str(base) or body.get("request") != os.environ.get("STS2_REFRESH_CYCLE"):
        raise ValueError("refresh launch identity mismatch")
    return body["selection"]


def bind_launch(root, code_root, request, options):
    """Persist before resource admission; a retry of one request never rebinds."""
    base = Path(root).resolve()
    directory = base / "data/learning-runtime-launches"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / (sha(request.encode()) + ".json")
    identity = {"schema": "fixed-refresh-launch-v1", "root": str(base), "code_root": str(Path(code_root).resolve()),
                "request": request, "options": options}
    with (directory / (path.stem + ".lock")).open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if path.exists():
            raw = checked_file(base, path)
            body = json.loads(raw)
            if any(body.get(k) != v for k, v in identity.items()):
                raise ValueError("refresh retry changed original launch")
        else:
            raw = (packed({**identity, "selection": capture(base)}) + "\n").encode()
            atomic(path, raw)
    os.environ["STS2_REFRESH_SELECTION_FILE"] = str(path)
    os.environ["STS2_REFRESH_SELECTION_SHA256"] = sha(raw)
    return launch_selection(base)


def method(root, producer, runtime_root=None):
    from fixed_producer_methods import method as fingerprint
    return fingerprint(root, producer, runtime_root)


def source_cut(root, producer=None, characters=None):
    """Name actual input bytes, including independent role denominators in JSON outputs."""
    root = Path(root)
    names = ["knowledge/common/move-model.json"] if producer == "fight-value" else []
    if producer == "v6-history":
        names += [f"knowledge/characters/{c}/build-cores.json" for c in characters or []]
    result = {}
    for name in names:
        selected = knowledge_input(root, name.removeprefix("knowledge/")) if producer == "v6-history" else root / name
        if selected.is_file():
            base = Path(os.environ["STS2_FIXED_KNOWLEDGE_SNAPSHOT"]) if producer == "v6-history" and os.environ.get("STS2_FIXED_KNOWLEDGE_SNAPSHOT") else root
            result[name] = sha(checked_file(base, selected, 128 * 1024 * 1024))
    return result


def knowledge_input(root, relative):
    selected = os.environ.get("STS2_FIXED_KNOWLEDGE_SNAPSHOT")
    return Path(selected) / relative if selected else Path(root) / "knowledge" / relative


def knowledge_binding(root):
    from knowledge_runtime_env import snapshot
    directory = snapshot(root).get("STS2_KNOWLEDGE_RUNTIME")
    if not directory:
        return None
    # Read K1 with the repaired Node SQLite, never the host's older Python SQLite.
    # No TypeScript/esbuild child is needed for this bounded read-only query.
    script = """import {DatabaseSync} from 'node:sqlite';
const d=new DatabaseSync(process.argv[1],{readOnly:true});
try { const s=String(d.prepare('select sqlite_version() v').get().v).split('.').map(Number);
if(!(s[0]>3||s[0]===3&&(s[1]>51||s[1]===51&&s[2]>=3||s[1]===50&&s[2]>=7||s[1]===44&&s[2]>=6)))throw Error('unrepaired SQLite');
d.exec('BEGIN'); const v=d.prepare("select value from metadata where key='current'").get()?.value;
const r=d.prepare('select manifest from releases where version=?').get(v); d.exec('COMMIT');
if(!r)throw Error('missing K1 baseline');console.log(JSON.stringify({version:v,manifest:JSON.parse(r.manifest)}));
}finally{d.close();}"""
    result = subprocess.run([os.environ.get("STS2_NODE_BIN", "node"), "--input-type=module", "-e", script, str(Path(directory) / "knowledge.sqlite")],
                            capture_output=True, text=True, check=True, timeout=20)
    body = json.loads(result.stdout)
    version = body["version"]
    if not isinstance(version, str) or not version.startswith("K1-") or len(version) != 67:
        raise ValueError("invalid fixed producer knowledge binding")
    path = Path(directory) / "snapshots" / version
    # The original K1 publisher owns snapshot construction. Verify, never create
    # or replace a formal knowledge source from a fixed data refresh.
    for name, digest in body["manifest"]["files"].items():
        if name.endswith("/build-cores.json") and sha(checked_file(path, path / name)) != digest:
            raise ValueError("fixed producer K1 source hash mismatch")
    return {"version": version, "snapshot": str(path), "manifest": body["manifest"]["files"]}


def formal_document(root, relative):
    binding = knowledge_binding(root)
    if binding is None or relative not in binding["manifest"]:
        return None  # An unmigrated role/document retains its original source.
    path = Path(binding["snapshot"]) / relative
    raw = checked_file(binding["snapshot"], path)
    if sha(raw) != binding["manifest"][relative]:
        raise ValueError("formal source hash mismatch")
    return json.loads(raw)


def validate_output(name, raw):
    value = json.loads(raw, parse_constant=lambda _: (_ for _ in ()).throw(ValueError("nonfinite data")))
    if not isinstance(value, dict):
        raise ValueError("fixed data must be an object")
    # Fixed producer selection is the authority; arbitrary JSON/scripting is never
    # accepted through learner candidates. Existing producer gates remain intact.
    character = name.split("/")[1] if name.startswith("characters/") else None
    if character and "character" in value and str(value["character"]).lower() != character:
        raise ValueError("wrong-character fixed data")
    return value


def active(root, step, state_dir=None):
    chosen = launch_selection(root, state_dir)
    producer = step.split(":")[0]
    return chosen if chosen.get("enabled") and producer in chosen.get("refresh", []) else None


def output_paths(root, producer, characters):
    return [Path(root) / "knowledge" / name.format(character=c)
            for name in OUTPUTS[producer] for c in (characters if "{character}" in name else [""])]


def publish_outputs(store, request, base, paths, root, provenance):
    files = {}
    for path in paths:
        if path.is_file():
            raw = checked_file(Path(root) / "knowledge", path, 128 * 1024 * 1024)
            name = str(path.relative_to(Path(root) / "knowledge"))
            validate_output(name, raw)
            files[name] = raw
    if not files:
        raise ValueError("fixed producer has no output")
    return store.publish(request, base, files, provenance)


@contextmanager
def refresh_step(root, code_root, step, characters, request, chosen_override=None, method_root=None):
    """Wrap the existing successful producer, including its original scientific gates.

    Legacy files are compatibility views. On admission they have exactly one
    writer, this adapter; newly bound consumers use only immutable D1 bytes.
    The journal restores preimages after an interrupted/failed producer. No
    automatic source lock removal or replay of the computation occurs.
    """
    chosen = chosen_override if chosen_override is not None else active(root, step)
    if chosen is None:
        yield None
        return
    producer = step.split(":")[0]
    method_root = Path(method_root or code_root).resolve()
    directory = Path(chosen["directory"])
    if not (directory / "learning.sqlite").is_file():
        raise ValueError("original fixed-data database unavailable; restore rather than reinitialize")
    journal = directory / ("refresh-journal-" + sha(str(Path(code_root).resolve()).encode())[:12] + ".json")
    with (directory / "data-publication.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        store = Store(directory)
        old_env = os.environ.get("STS2_FIXED_DATA_LEASE")
        old_journal = os.environ.get("STS2_FIXED_DATA_JOURNAL")
        old_knowledge = os.environ.get("STS2_FIXED_KNOWLEDGE_SNAPSHOT")
        old_fd = os.environ.get("STS2_FIXED_DATA_LOCK_FD")
        was_inheritable = os.get_inheritable(lock.fileno())
        try:
            recover(store, journal, code_root)
            if not store.current():
                raise ValueError("fixed-data baseline missing; seed original published bytes before switching")
            previous = store.data_receipt(request)
            if previous:
                # A restart checks the durable result; it must not recompute or
                # republish completed data under a newer method/base.
                yield {"rc": 0, "version": previous["version"], "already_completed": True}
                return
            from fixed_producer_methods import manifest as method_manifest
            fingerprint = method(method_root, producer, root)
            if chosen["methods"].get(producer) != fingerprint:
                raise ValueError("unadmitted fixed method/consumer capability; engineering required")
            knowledge = knowledge_binding(root) if producer == "v6-history" else None
            if knowledge:
                os.environ["STS2_FIXED_KNOWLEDGE_SNAPSHOT"] = knowledge["snapshot"]
            else:
                os.environ.pop("STS2_FIXED_KNOWLEDGE_SNAPSHOT", None)
            paths = output_paths(code_root, producer, characters)
            before = {}
            # Preimages use the same immutable object store as releases, without
            # duplicating large JSON as a hex-expanded journal or losing recovery
            # at the consumer's maximum 128 MiB payload size.
            with store.transaction():
                for p in paths:
                    raw = checked_file(Path(code_root) / "knowledge", p, 128 * 1024 * 1024) if p.is_file() else None
                    before[str(p)] = sha(raw) if raw is not None else None
                    if raw is not None:
                        store.db.execute("INSERT OR IGNORE INTO objects VALUES(?,?)", (sha(raw), raw))
            inputs = source_cut(code_root, producer, characters)
            base = store.current()
            state = {"schema": "fixed-data-journal-v1", "request": request, "base": base, "paths": before,
                     "root": str(Path(code_root).resolve()), "status": "preparing"}
            atomic(journal, (packed(state) + "\n").encode())
            os.environ["STS2_FIXED_DATA_LEASE"] = str(directory)
            os.environ["STS2_FIXED_DATA_JOURNAL"] = str(journal)
            os.set_inheritable(lock.fileno(), True)
            os.environ["STS2_FIXED_DATA_LOCK_FD"] = str(lock.fileno())
            result = {"rc": None, "version": None}
            yield result
            if result["rc"] != 0:
                raise ValueError("fixed producer failed; previous data retained")
            if method(method_root, producer, root) != fingerprint or source_cut(code_root, producer, characters) != inputs:
                raise ValueError("fixed method/knowledge inputs changed during refresh")
            provenance = {"producer": producer, "method_sha256": fingerprint, "consumer_capability": "fixed-data-v1",
                          "characters": characters, "knowledge_inputs": inputs,
                          "method_source_root": str(method_root), "method_runtime_root": str(Path(root).resolve()),
                          "method_manifest": method_manifest(method_root, producer, root), "compatibility_root": str(Path(code_root).resolve()),
                          "knowledge_version": knowledge["version"] if knowledge else None,
                          "knowledge_dependencies": {name.removeprefix("knowledge/"): digest for name, digest in inputs.items()
                                                     if Path(name).name in ("build-cores.json",)},
                          "model_inputs": {name: digest for name, digest in inputs.items() if Path(name).name != "build-cores.json"},
                          "control_sha256": chosen["control_sha256"], "scientific_gates": "original producer unchanged",
                          "samples": "original per-character/ascension fields and source references in immutable output"}
            unchanged = all((sha(checked_file(Path(code_root) / "knowledge", p, 128 * 1024 * 1024)) if p.is_file() else None) == before[str(p)] for p in paths)
            result["version"] = base if unchanged else publish_outputs(store, request, base, paths, code_root, provenance)
            receipt = {"schema": "fixed-data-completion-v1", "request": request, "version": result["version"],
                       "status": "unchanged" if unchanged else "published", "producer": producer,
                       "completed_at": datetime.now(timezone.utc).isoformat(),
                       "method_sha256": fingerprint, "control_sha256": chosen["control_sha256"]}
            with store.transaction():
                store.db.execute("INSERT INTO data_attempts VALUES(?,?,?)", (request, result["version"], packed(receipt)))
            result["status"] = receipt["status"]
            state.update(status="committed", version=result["version"])
            atomic(journal, (packed(state) + "\n").encode())
        except BaseException:
            recover(store, journal, code_root)
            raise
        finally:
            if old_env is None:
                os.environ.pop("STS2_FIXED_DATA_LEASE", None)
            else:
                os.environ["STS2_FIXED_DATA_LEASE"] = old_env
            if old_journal is None:
                os.environ.pop("STS2_FIXED_DATA_JOURNAL", None)
            else:
                os.environ["STS2_FIXED_DATA_JOURNAL"] = old_journal
            if old_knowledge is None:
                os.environ.pop("STS2_FIXED_KNOWLEDGE_SNAPSHOT", None)
            else:
                os.environ["STS2_FIXED_KNOWLEDGE_SNAPSHOT"] = old_knowledge
            if old_fd is None:
                os.environ.pop("STS2_FIXED_DATA_LOCK_FD", None)
            else:
                os.environ["STS2_FIXED_DATA_LOCK_FD"] = old_fd
            os.set_inheritable(lock.fileno(), was_inheritable)
            store.close()


def recover(store, journal, root):
    if not journal.exists():
        return
    row = json.loads(checked_file(store.directory, journal, 1024 * 1024))
    if row["root"] != str(Path(root).resolve()):
        raise ValueError("foreign refresh journal")
    # The commit may have succeeded before the process could persist its receipt.
    committed = store.db.execute("SELECT version,provenance FROM data_releases WHERE request=?", (row["request"],)).fetchone()
    if committed and not store.data_receipt(row["request"]):
        provenance = json.loads(committed[1])
        receipt = {"schema": "fixed-data-completion-v1", "request": row["request"], "version": committed[0],
                   "status": "published", "producer": provenance["producer"], "method_sha256": provenance["method_sha256"],
                   "control_sha256": provenance["control_sha256"]}
        with store.transaction():
            store.db.execute("INSERT INTO data_attempts VALUES(?,?,?)", (row["request"], committed[0], packed(receipt)))
    if not committed and row["status"] == "preparing":
        allowed = Path(root).resolve() / "knowledge"
        for name, digest in row["paths"].items():
            path = Path(name)
            path.relative_to(allowed)
            if path.is_symlink() or path.parent.resolve() != path.parent:
                raise ValueError("unsafe interrupted compatibility path")
            if digest is None:
                path.unlink(missing_ok=True)
            else:
                original = store.db.execute("SELECT body FROM objects WHERE digest=?", (digest,)).fetchone()
                if original is None or sha(original[0]) != digest:
                    raise ValueError("fixed preimage object unavailable; preserve journal")
                atomic(path, original[0])
        row["status"] = "restored"
        atomic(journal, (packed(row) + "\n").encode())
    elif committed and row["status"] == "preparing":
        row.update(status="committed", version=committed[0])
        atomic(journal, (packed(row) + "\n").encode())


def seed(root, directory, request):
    """Explicit natural-boundary initial adapter: exact published bytes, no retuning."""
    root = Path(root).resolve()
    characters = [p.name for p in (root / "knowledge/characters").iterdir() if p.is_dir()]
    paths = set(p for producer in OUTPUTS for p in output_paths(root, producer, characters) if p.is_file())
    store = Store(directory)
    try:
        inputs = source_cut(root, "v6-history", characters)
        return publish_outputs(store, request, None, sorted(paths), root,
                               {"producer": "initial-adapter", "consumer_capability": "fixed-data-v1", "scope_change": False,
                                "knowledge_dependencies": {name.removeprefix("knowledge/"): digest for name, digest in inputs.items()}})
    finally:
        store.close()


def current_file(root, state_dir, relative, legacy_root=None):
    chosen = capture(root, state_dir)
    if not chosen.get("enabled") or not any(pattern == relative or pattern.replace("{character}", relative.split("/")[1]) == relative for pattern in managed_paths(chosen)):
        return Path(legacy_root or root) / "knowledge" / relative
    store = Store(chosen["directory"], readonly=True)
    try:
        version = store.current()
        if not version or relative not in store.manifest(version):
            raise ValueError("fixed data baseline missing")
        return Path(store.snapshot(version)) / relative
    finally:
        store.close()


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=["method", "seed"])
    p.add_argument("--root", required=True)
    p.add_argument("--producer")
    p.add_argument("--runtime")
    p.add_argument("--request")
    a = p.parse_args()
    print(method(a.root, a.producer) if a.command == "method" else seed(a.root, a.runtime, a.request))
