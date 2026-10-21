#!/usr/bin/env python3
"""Build mechanical reference facts from one licensed, pinned public snapshot."""
import argparse
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.request
from datetime import datetime, timezone

REV = "4f52f5a53597e4fdc6cf130f7ebe2cdd35236101"
VERSION = "v0.111.0"
KINDS = ("cards", "relics", "monsters", "events")
LICENSE = "https://polyformproject.org/licenses/noncommercial/1.0.0"
NOTICE = "Copyright © 2025-present Peter Lord and Spire Codex contributors."


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()
    if path.exists() and path.read_bytes() == raw:
        return
    temp = path.with_suffix(f".tmp-{os.getpid()}")
    temp.write_bytes(raw)
    temp.replace(path)


def cached(cache, relative, url, network):
    path = cache / relative
    if not path.exists():
        if not network:
            raise RuntimeError(f"missing cached source: {relative}")
        with urllib.request.urlopen(url, timeout=20) as response:
            raw = response.read(12_000_001)
        if len(raw) > 12_000_000:
            raise RuntimeError("source exceeds size limit")
        json.loads(raw)  # Reject truncated/error responses before caching.
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(".download")
        temp.write_bytes(raw)
        temp.replace(path)
    raw = path.read_bytes()
    return json.loads(raw), {"url": url, "downloaded_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(), "sha256": sha(raw)}


def text(value):
    return re.sub(r"\[/?(?:gold|blue|red|green|purple|orange|yellow|sine|jitter|b|i)\]", "", value or "")


def options(rows):
    return [{k: text(row.get(k)) for k in ("id", "title", "description")} for row in rows or []]


def normalize(kind, en, zh, provenance):
    row = {"kind": kind, "id": en["id"], "name": zh.get("name", en["name"]), "aliases": [en["name"]],
           "source": "external:spire-codex", "game_version": VERSION, "provenance": provenance,
           "origin_pool": en.get("color", en.get("pool", "shared")), "evidence_scope": "external-reference; not live validation"}
    if kind == "cards":
        fields = ("cost", "is_x_cost", "star_cost", "is_x_star_cost", "target", "color", "damage", "block", "hit_count", "vars", "upgrade", "powers_applied", "cards_draw", "energy_gain", "hp_loss", "spawns_cards", "multiplayer_only")
        row["facts"] = {k: en[k] for k in fields if en.get(k) is not None}
        row["facts"].update(type=en.get("type_key", en["type"]), rarity=en.get("rarity_key", en["rarity"]), keywords=en.get("keywords") or [])
        row.update(description=text(zh.get("description")), description_en=text(en.get("description")),
                   upgraded_description=text(zh.get("upgrade_description")), upgraded_description_en=text(en.get("upgrade_description")))
    elif kind == "relics":
        row.update(description=text(zh.get("description")), description_en=text(en.get("description")))
        row["facts"] = {k: en[k] for k in ("rarity_key", "pool", "merchant_price") if en.get(k) is not None}
    elif kind == "monsters":
        row["facts"] = {k: zh.get(k, en.get(k)) for k in ("type", "min_hp", "max_hp", "min_hp_ascension", "max_hp_ascension", "moves", "encounters", "innate_powers", "attack_pattern")}
        row["limits"] = "进阶阈值未给出；普通/进阶值并列保留，不推定当前进阶适用值。出招图是外部描述，未证明模拟支持。"
    else:
        row["facts"] = {"act": en.get("act"), "preconditions": en.get("preconditions"), "options": options(zh.get("options")),
                        "pages": [{"id": p["id"], "options": options(p.get("options"))} for p in (zh.get("pages") or []) if p.get("options")]}
        row["limits"] = "只存机械选项效果；选项可随页面/局面变化，当前游戏选项优先。"
    return row


def build(root, network=False):
    cache = root / "data/external/spire-codex"
    cache.mkdir(parents=True, exist_ok=True)
    with (cache / "download.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        # The already-reviewed license is pinned by its Git blob, independent of future main changes.
        license_url = f"https://api.github.com/repos/ptrlrd/spire-codex/license?ref={REV}"
        license_file = cache / "license.json"
        if license_file.exists():
            lic = json.loads(license_file.read_text())
        else:
            lic, _ = cached(cache, "license.json", license_url, network)
        body = base64.b64decode(lic["content"])
        if b"PolyForm Noncommercial License 1.0.0" not in body or NOTICE.encode() not in body:
            raise RuntimeError("license differs from reviewed noncommercial terms")
        sources, common, silent = {}, [], []
        for kind in KINDS:
            values = {}
            for lang in ("eng", "zhs"):
                relative = f"{REV}/data-beta/{VERSION}/{lang}/{kind}.json"
                url = f"https://raw.githubusercontent.com/ptrlrd/spire-codex/{REV}/data-beta/{VERSION}/{lang}/{kind}.json"
                rows, meta = cached(cache, relative, url, network)
                key = f"{kind}:{lang}"
                sources[key] = {**meta, "game_version": VERSION, "samples": len(rows), "license": LICENSE,
                                "required_notice": NOTICE, "filter": "按 ID 一对一机械整理；移除图片、风味和事件长剧情；不产生策略或实盘样本"}
                values[lang] = {row["id"]: row for row in rows}
                if len(values[lang]) != len(rows):
                    raise RuntimeError("duplicate source IDs")
            if values["eng"].keys() != values["zhs"].keys():
                raise RuntimeError("localized ID inventory differs")
            for ident, en in sorted(values["eng"].items()):
                row = normalize(kind, en, values["zhs"][ident], [f"{kind}:eng", f"{kind}:zhs"])
                (silent if row["origin_pool"] == "silent" else common).append(row)
        manifest = {"schema": "open-book-sources-v1", "source": "external:spire-codex", "revision": REV, "game_version": VERSION,
                    "license": LICENSE, "license_url": f"https://github.com/ptrlrd/spire-codex/blob/{REV}/LICENSE.md", "license_sha256": sha(body),
                    "license_review": "PolyForm Noncommercial 1.0.0：仅非商业研究/个人爱好用途；分发保留许可 URL 与 Required Notice。未授权商用。", "required_notice": NOTICE, "sources": sources}
        for location, entries in (("common", common), ("characters/silent", silent)):
            save(root / "knowledge" / location / "open-book.json", {"schema": "open-book-v1", "sources": manifest, "entries": entries})
        return common + silent


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--network", action="store_true", help="only outside play; cached sources are never downloaded twice")
    args = parser.parse_args()
    entries = build(args.root.resolve(), args.network)
    print(json.dumps({kind: sum(e["kind"] == kind for e in entries) for kind in KINDS}))
