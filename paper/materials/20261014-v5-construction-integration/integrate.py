#!/usr/bin/env python3
"""One-shot integration of frozen, checked watcher source; no waiting, process control or knowledge writes."""
from pathlib import Path
import datetime, fcntl, hashlib, json, subprocess, sys
ROOT=Path("/home/dw/Projects/agent-sts2")
OUT=ROOT/"paper/materials/20261014-v5-construction-integration"
LIVE=ROOT/".worktrees/live"
SOURCE="f6eeaf7c8c323d623057a8c7184f76c9456a561e"
BASE="f99d9d0ea2cff14c827c3ac7f689d8048675d8e1"
MANIFEST=json.loads((OUT/"source-commit.json").read_text())
PATHS=[v["path"] for v in MANIFEST["paths"]]
TRAILER="\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>"
def git(root,*args,check=True):
    return subprocess.run(["git","-C",str(root),*args],capture_output=True,check=check)
def head(root):return git(root,"rev-parse","HEAD").stdout.decode().strip()
def blob(ref,path):
    v=git(ROOT,"show",ref+":"+path,check=False)
    return v.stdout if v.returncode==0 else None
def digest(value):return hashlib.sha256(value).hexdigest()
def knowledge(root):
    return {name:digest((root/name).read_bytes()) for name in git(root,"ls-files","knowledge").stdout.decode().splitlines() if (root/name).is_file()}
def write_receipt(name,value):
    (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n")
with (ROOT/"ops/live-merge.lock").open("a") as lock:
    try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:
        print("original live lock busy; no integration writes")
        sys.exit(75)
    result={"at":datetime.datetime.now().astimezone().isoformat(),"source":SOURCE,"own_paths":PATHS,"pre_main":head(ROOT),"pre_live":head(LIVE)}
    try:
        assert MANIFEST["commit"]==SOURCE
        assert json.loads((OUT/"checks.json").read_text())["sandbox"]["exit"]==0
        snapshots={}
        for name,root in [("main",ROOT),("live",LIVE)]:
            assert not git(root,"diff","--cached","--name-only").stdout.strip(), name+" index occupied"
            assert not git(root,"status","--porcelain","--untracked-files=all","--",*PATHS).stdout.strip(), name+" selected source dirty"
            snapshots[name]=knowledge(root)
            for row in MANIFEST["paths"]:
                path=row["path"]; desired=blob(SOURCE,path); assert desired is not None and digest(desired)==row["sha256"]
                current=(root/path).read_bytes() if (root/path).exists() else None
                base=blob(BASE,path)
                assert current==desired or current==base or (current is not None and base is not None and current.replace(b"Dai",b"Roy")==base),name+" source changed: "+path
        preview=git(ROOT,"merge-tree","--write-tree","HEAD",SOURCE,check=False)
        (OUT/"main-merge-preflight.txt").write_bytes(preview.stdout+preview.stderr)
        assert preview.returncode==0,"main merge conflict; no merge attempted"
        merged=git(ROOT,"merge","--no-ff","-m","Integrate Silent construction combat evidence and structured plans"+TRAILER,SOURCE)
        (OUT/"main-merge.log").write_bytes(merged.stdout+merged.stderr)
        result["main"]=head(ROOT)
        changed=[]
        for row in MANIFEST["paths"]:
            path=row["path"]; desired=blob(SOURCE,path); target=LIVE/path
            if not target.exists() or target.read_bytes()!=desired:
                target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(desired);changed.append(path)
        if changed:
            git(LIVE,"add","--",*changed)
            assert set(git(LIVE,"diff","--cached","--name-only").stdout.decode().splitlines())==set(changed)
            message="Deploy Silent construction combat evidence and structured plans\n\nExact20-leaf source: "+SOURCE+". Preserve all refreshed knowledge, original fixed-check source and running games."+TRAILER
            committed=subprocess.run(["git","-C",str(LIVE),"commit","-F","-"],input=message.encode(),capture_output=True,check=True)
            (OUT/"live-source-commit.log").write_bytes(committed.stdout+committed.stderr)
        result["live_behavior"]=head(LIVE)
        before_tree=git(LIVE,"rev-parse","HEAD^{tree}").stdout
        if git(LIVE,"merge-base","--is-ancestor",SOURCE,"HEAD",check=False).returncode:
            linked=git(LIVE,"merge","-s","ours","--no-ff","-m","Bind checked construction source after exact20-leaf deployment\n\nOnly20 checked leaves deployed; all other live content and knowledge retained."+TRAILER,SOURCE)
            (OUT/"live-source-binding.log").write_bytes(linked.stdout+linked.stderr)
        assert git(LIVE,"rev-parse","HEAD^{tree}").stdout==before_tree
        result["live"]=head(LIVE)
        result["source_leaves"]=[]
        for row in MANIFEST["paths"]:
            path=row["path"]
            for name,root in [("main",ROOT),("live",LIVE)]:
                assert digest((root/path).read_bytes())==row["sha256"], name+" physical leaf mismatch: "+path
                assert git(root,"ls-tree","HEAD","--",path).stdout==git(ROOT,"ls-tree",SOURCE,"--",path).stdout,name+" git leaf mismatch: "+path
            result["source_leaves"].append(row)
        result["knowledge"]={name:{"before":snapshots[name],"after":knowledge(root)} for name,root in [("main",ROOT),("live",LIVE)]}
        result["knowledge_unchanged"]={name:v["before"]==v["after"] for name,v in result["knowledge"].items()}
        result["source_ancestor"]={name:git(root,"merge-base","--is-ancestor",SOURCE,"HEAD",check=False).returncode==0 for name,root in [("main",ROOT),("live",LIVE)]}
        result["limits"]=["Formal behavior number and new deployed-tree host full acceptance belong to original ops.","Natural consumer use, B3 throughput and prospective probability calibration remain distinct pending checks.","No game restart, model switch, cap or sampling-budget change."]
        write_receipt("integration.json",result)
        print(json.dumps({k:result[k] for k in ["source","main","live_behavior","live","knowledge_unchanged","source_ancestor"]}))
    except BaseException as e:
        result.update(error=str(e),actual_main=head(ROOT),actual_live=head(LIVE))
        write_receipt("integration-failure-"+datetime.datetime.now().strftime("%H%M%S")+".json",result)
        raise
