#!/usr/bin/env python3
"""Mechanically index published layout and mirror enemy data; never infer a game rule."""
import argparse
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile

SCHEMA = "knowledge-catalog-v1"
GENERATED = {"mechanics-observed.json", "model-observed.json", "_legacy-meta.json"}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return value if re.fullmatch(r"[A-Za-z0-9_-]+", value) else "~" + base64.urlsafe_b64encode(value.encode()).decode().rstrip("=")


def data(raw):
    return json.loads(raw)


def rendered(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def checked(root, path):
    if any(p.is_symlink() for p in (path, *path.parents)) or not path.absolute().is_relative_to(root.absolute()):
        raise ValueError("knowledge path must remain in this snapshot without symlinks")
    return path


def atomic(path, raw):
    if path.is_file() and path.read_bytes() == raw:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".catalog-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(raw)
            output.flush()
            os.fsync(output.fileno())
            os.fchmod(output.fileno(), 0o644)
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def build(root):
    root = Path(root).absolute()
    checked(root, root)
    directory = root.parent / "ops/codex-ops"
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "knowledge-catalog.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        sources, originals, generated, creates = {}, {}, {}, {}
        paths = list((root / "common").glob("*.json"))
        if (root / "characters").is_dir():
            for role in sorted((root / "characters").iterdir()):
                if role.is_dir() and re.fullmatch(r"[a-z0-9_]+", role.name):
                    paths += [p for p in role.rglob("*") if p.suffix in (".json", ".md") and p.is_file()]
        enemies_dir = root / "common/enemies"
        if enemies_dir.is_dir():
            paths += [p for p in enemies_dir.rglob("*.json") if p.name not in GENERATED]
        for path in sorted(set(paths)):
            checked(root, path)
            raw = path.read_bytes()
            relative = path.relative_to(root).as_posix()
            parts = path.relative_to(root).parts
            character = parts[1] if parts[0] == "characters" else None
            originals[relative] = raw
            sources[relative] = {"path": relative, "sha256": sha(raw), "bytes": len(raw),
                "source_character": character, "storage_scope": "character" if character else "common",
                "scope_policy": "原条件/进阶/证据/未知保持；查询和迁移不增加验证或独立支持数。"}
        legacy, enemy_index = {}, {}
        for name, container, output_name in (("monster-db.json", "monsters", "mechanics-observed.json"),
                                               ("move-model.json", None, "model-observed.json")):
            relative = "common/" + name
            if relative not in originals:
                continue
            document = data(originals[relative])
            entries = document.get(container, {}) if container else document
            if not isinstance(entries, dict):
                raise ValueError("legacy enemy source is not an object")
            # Unknown root fields remain in metadata, never treated as a monster.
            ids = [key for key, value in entries.items() if isinstance(value, dict)
                   and (container or "next" in value or "damage" in value)]
            fields = {key: value for key, value in document.items() if key != container} if container else {
                key: value for key, value in document.items() if key not in ids}
            view = {"source": relative, "source_sha256": sources[relative]["sha256"],
                    "container": container, "root_order": list(document), "enemy_order": ids,
                    "container_order": list(entries) if container else [],
                    "container_fields": {key: value for key, value in entries.items() if key not in ids} if container else {},
                    "root_fields": fields, "fragments": {}}
            for enemy in ids:
                folder = "common/enemies/" + encoded(enemy)
                fragment = folder + "/" + output_name
                generated[fragment] = rendered({"schema": "legacy-enemy-observation-v1", "enemy_id": enemy,
                    "source": relative, "pointer": [container, enemy] if container else [enemy],
                    "scope_policy": "仅机械封装原common数据，未扩适用范围或新增机制结论。", "payload": entries[enemy]})
                view["fragments"][enemy] = fragment
                index = enemy_index.setdefault(enemy, {"mechanics": None, "model": None})
                field = "mechanics" if container else "model"
                index[field] = fragment
                curated = folder + "/" + field + ".json"
                if curated not in sources:
                    raw = rendered({"schema": "curated-enemy-" + field + "-v1", "enemy_id": enemy,
                        "legacy_observation": fragment, "rules": [],
                        "_about": "规则为空不表示无机制。此文件不由日常事实重建覆盖；新增或扩范围由学习者带对局证据发布。"})
                    creates[curated] = raw
                    sources[curated] = {"path": curated, "sha256": sha(raw), "bytes": len(raw),
                        "source_character": None, "storage_scope": "common",
                        "scope_policy": "原条件/进阶/证据/未知保持；查询和迁移不增加验证或独立支持数。"}
                index["curated_" + field] = curated
            legacy[name] = view
        metadata = "common/enemies/_legacy-meta.json"
        generated[metadata] = rendered({"schema": "legacy-enemy-metadata-v1", "views": legacy})
        catalog = {"schema": SCHEMA, "migration_stage": "guarded-public-layer-with-legacy-compatible-views",
            "_about": "存储/索引不证明角色无关、可信或自然采用；原common范围保持，角色统计分账，跨角色只读参考。",
            "sources": dict(sorted(sources.items())), "enemies": enemy_index,
            "legacy_views": {name: {"source": view["source"], "source_sha256": view["source_sha256"],
                                   "metadata": metadata} for name, view in legacy.items()},
            "generated_files": {name: {"sha256": sha(raw), "bytes": len(raw)} for name, raw in generated.items()},
            "curated_files_never_overwritten": True, "game_knowledge_added": False,
            "evidence_policy": "逐条保留原证据；无原局号时明确未知，仅有文件SHA不能补证。"}
        # Validate the whole source cut before publishing. Existing legacy files are never rewritten.
        for name, raw in originals.items():
            if checked(root, root / name).read_bytes() != raw:
                raise ValueError("parallel knowledge change; preserve candidate and rebuild")
        for name, raw in creates.items():
            path = checked(root, root / name)
            path.parent.mkdir(parents=True, exist_ok=True)
            # A curator that arrived in parallel is retained, not overwritten.
            fd, temporary = tempfile.mkstemp(prefix=".curated-stub-", dir=path.parent)
            try:
                with os.fdopen(fd, "wb") as output:
                    output.write(raw)
                    output.flush()
                    os.fsync(output.fileno())
                    os.fchmod(output.fileno(), 0o644)
                os.link(temporary, path)
            except FileExistsError:
                raise ValueError("parallel curated rule retained; rebuild catalogue")
            finally:
                Path(temporary).unlink(missing_ok=True)
        for name, raw in generated.items():
            atomic(checked(root, root / name), raw)
        atomic(root / "catalog.json", rendered(catalog))
        return {"schema": SCHEMA, "sources": len(sources), "enemies": len(enemy_index),
                "generated_files": len(generated), "new_curated_stubs": len(creates),
                "original_source_bytes_unchanged": True, "catalog_sha256": sha((root / "catalog.json").read_bytes()),
                "game_knowledge_added": False}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--knowledge-root", type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(build(args.knowledge_root), ensure_ascii=False))


if __name__ == "__main__":
    main()
