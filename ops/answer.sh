#!/usr/bin/env bash
# answer.sh <pending-file> <choice> <reason...>: write the answer for an escalation question atomically.
set -eu
cd "$HOME/Projects/sts2-jev/jev-sts2-v4run"
pending="$1"; choice="$2"; shift 2; reason="$*"
ans=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["answer_file"])' "$pending" 2>/dev/null || python3 -c 'import sys,os; p=sys.argv[1]; print(os.path.join(os.path.dirname(p), os.path.basename(p).replace("pending-","answer-")))' "$pending")
python3 -c 'import json,sys; o=json.load(open(sys.argv[2]))["options"]; sys.exit(0 if sys.argv[1] in o else "choice %r not in options %s" % (sys.argv[1], list(o)))' "$choice" "$pending"
python3 -c 'import json,sys; json.dump({"choice":sys.argv[1],"reason":sys.argv[2]}, open(sys.argv[3]+".tmp","w"), ensure_ascii=False)' "$choice" "$reason" "$ans"
mv "$ans.tmp" "$ans"; echo "answered $choice"
