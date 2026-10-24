"""Compare the optional tools check with exact Git source and unchanged local dependencies."""
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile
import uuid

OUTPUT = Path(__file__).resolve().parent
ROOT = OUTPUT.parents[2]
BASE = "8a6e5016d83d5dc29ec630eda6881f14e889cf8e"
selected = subprocess.check_output(["git", "-C", str(ROOT), "ls-tree", "-r", "--name-only", BASE, "--",
    "agent/src", "agent/tools", "agent/tsconfig.json", "agent/tsconfig.tools.json", "agent/package.json",
    "learner/lib", "learner/run.ts", "learner/package.json", "ops", "eval", "package.json"], text=True).splitlines()
selected = [name for name in selected if name.endswith((".ts", ".mts")) or Path(name).name in
            ("package.json", "tsconfig.json", "tsconfig.tools.json")]
# No repository archive, history, raw logs, credentials, generated data or dependency copies.
snapshot = ROOT / ".cache" / ("issue57-tools-baseline-" + uuid.uuid4().hex)
snapshot.mkdir(parents=True)
raw = subprocess.check_output(["git", "-C", str(ROOT), "archive", BASE, "--", *selected])
with tarfile.open(fileobj=io.BytesIO(raw)) as archive:
    archive.extractall(snapshot, filter="data")
for name in ("knowledge", "paper", "third_party"):
    (snapshot / name).symlink_to(ROOT / name, target_is_directory=True)
(snapshot / "agent/node_modules").symlink_to(ROOT / "agent/node_modules", target_is_directory=True)


def check(root, label):
    command = ["nice", "-n", "19", "node", str(ROOT / "agent/node_modules/typescript/bin/tsc"),
               "-p", "tsconfig.tools.json", "--noEmit"]
    result = subprocess.run(command, cwd=root / "agent", text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    (OUTPUT / (label + ".log")).write_text(result.stdout)
    normalized = result.stdout.replace(str(root), "<repo>").replace(str(ROOT), "<repo>")
    return result.returncode, normalized


baseline_rc, baseline = check(snapshot, "tools-baseline")
current_rc, current = check(ROOT, "tools-current")
proof = {"base": BASE, "source_paths": selected, "snapshot": str(snapshot.relative_to(ROOT)),
         "dependencies": "original agent/node_modules symlink; no installation or changes",
         "baseline_rc": baseline_rc, "current_rc": current_rc,
         "baseline_errors": len(re.findall(r"error TS[0-9]+:", baseline)),
         "current_errors": len(re.findall(r"error TS[0-9]+:", current)),
         "identical": baseline_rc == current_rc and baseline == current}
(OUTPUT / "tools-cli-comparison.json").write_text(json.dumps(proof, indent=2) + "\n")
print(json.dumps({key: proof[key] for key in ("baseline_rc", "current_rc", "baseline_errors", "current_errors", "identical")}))
raise SystemExit(0 if proof["identical"] else 1)
