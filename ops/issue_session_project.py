"""STS2 publication, learner ownership and archive adapter; selected by board.yaml."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import learner_retention as retention
import worktree_retention as workspaces


class Project:
    def __init__(self, root, directory):
        self.root, self.directory = root, directory

    def checked_tree(self, branch):
        return workspaces.checked_tree(self.root, branch)

    def guard(self, row):
        workspaces.owner_guard(self.root, self.directory, Path(row["worktree"]))

    def publication(self, row):
        main = retention.git(self.root, "rev-parse", "refs/heads/main").decode().strip()
        live = retention.git(self.root / ".worktrees/live", "rev-parse", "HEAD").decode().strip()
        return workspaces.acceptance(self.root, Path(row["worktree"]), row["source"], main, live, row["base"])

    def reclaimed(self, row):
        manifest = self.directory / "retention/worktree-archives" / (row["branch"] + ".manifest.json")
        archive = retention.load(manifest) if manifest.is_file() else {}
        if (archive.get("state") != "reclaimed" or archive.get("root") != str(self.root)
                or archive.get("proof", {}).get("worktree") != row["worktree"]
                or any(r["worktree"] == row["worktree"] for r in workspaces.registered(self.root))):
            return False
        workspaces.verified_archive(self.root, archive)
        if retention.git(self.root, "rev-parse", "refs/heads/" + row["branch"]).decode().strip() != archive["proof"]["worktree_head"]:
            raise ValueError("retained source reference changed")
        return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["prepare"])
    parser.add_argument("root", type=Path)
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    # Allocation already attaches shared tools. Verify the exact dependency rather than replacing it.
    dependency = args.path / "agent/node_modules"
    if (not dependency.is_symlink() or not dependency.is_dir()
            or dependency.resolve() != (args.root / "agent/node_modules").resolve()):
        raise ValueError("verified shared agent/node_modules link required")
    print('{"prepared": true}')


if __name__ == "__main__":
    main()
