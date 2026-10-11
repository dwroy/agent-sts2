import collections, json, pathlib, subprocess, hashlib, re
root=pathlib.Path(__file__).parent
original=json.loads((root/"archive-gitleaks.json").read_text())
# Match the original full-directory scan; report values remain only in memory.
r=subprocess.run(["nice","-n","19","/home/dw/.local/bin/gitleaks","dir","paper/materials/session/codex","--report-format","json","--report-path","-","--log-level","error","--no-banner"],capture_output=True)
if r.returncode not in (0,1):raise RuntimeError("gitleaks failed")
findings=json.loads(r.stdout)
wanted=collections.defaultdict(set)
for f in findings:wanted[f["File"]].add(f["StartLine"])
parsed={}
for name,targets in wanted.items():
 with pathlib.Path(name).open("rb") as handle:
  for n,line in enumerate(handle,1):
   if n in targets:
    try:parsed[(name,n)]=json.loads(line)
    except ValueError:parsed[(name,n)]=None
   if n>=max(targets):break
def paths(value, needle, path="$"):
 if isinstance(value,str):
  if needle in value:yield path
 elif isinstance(value,dict):
  for k,v in value.items():yield from paths(v,needle,path+"."+k)
 elif isinstance(value,list):
  for i,v in enumerate(value):yield from paths(v,needle,path+"[]")
state=json.loads(pathlib.Path("ops/codex-ops/learn.json").read_text())
known_keys={v.get("key") for v in state["batches"].values() if isinstance(v.get("key"),str)}
run_ids=set()
for line in pathlib.Path("logs/runs.jsonl").read_text().splitlines():
 try:run_ids.add(json.loads(line).get("run_id"))
 except ValueError:pass
test_files=subprocess.check_output(["git","ls-files","agent/tests","tests"]).decode().splitlines()
test_data=[(name,pathlib.Path(name).read_bytes()) for name in test_files if pathlib.Path(name).is_file() and pathlib.Path(name).stat().st_size<2000000]
result=[]
for f in findings:
 i=(f["File"],f["StartLine"]); secret=f["Secret"]; locations=list(paths(parsed.get(i),secret))
 classification="unresolved"
 if locations and all(p.endswith(".encrypted_content") for p in locations):classification="ciphertext-pattern-not-plaintext-credential"
 elif re.fullmatch("[a-f0-9]{40}",secret):
  p=subprocess.run(["git","cat-file","-t",secret],capture_output=True)
  if p.returncode==0:classification="verified-git-object-id"
 elif re.fullmatch("[a-f0-9]{64}",secret):classification="sha256-shaped-needs-reference-proof"
 evidence=[]
 if secret in known_keys:
  classification="verified-scheduler-task-key";evidence=["ops/codex-ops/learn.json"]
 elif secret in run_ids:
  classification="verified-run-id";evidence=["logs/runs.jsonl"]
 elif classification=="unresolved":
  fixture=[name for name,data in test_data if secret.encode() in data]
  if fixture:classification="tracked-test-fixture-value";evidence=fixture
 # Emit only structural fields and candidate hash; do not expose the candidate itself.
 result.append({"rule":f["RuleID"],"file":i[0],"line":i[1],"locations":locations,"candidate_length":len(secret),"candidate_sha256":hashlib.sha256(secret.encode()).hexdigest(),"classification":classification,"evidence":evidence,"alphabet_hex":bool(re.fullmatch("[a-fA-F0-9]+",secret)),"match_prefix":f["Match"].replace(secret,"[REDACTED]")[:120]})
(root/"archive-candidate-classification-full.json").write_text(json.dumps({"original_count":len(original),"rescan_count":len(result),"findings":result},ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"original_count":len(original),"rescan_count":len(result),"classes":dict(collections.Counter(x["classification"] for x in result))}))
for x in result:
 if x["classification"]=="unresolved":print(json.dumps(x,ensure_ascii=False))
