import collections, json, pathlib, subprocess, hashlib, re
root=pathlib.Path(__file__).parent
original=json.loads((root/"archive-gitleaks.json").read_text())
wanted=collections.defaultdict(set)
for r in original:wanted[r["File"]].add(r["StartLine"])
lines=[];mapping=[]; parsed=[]
for name,targets in wanted.items():
 with pathlib.Path(name).open("rb") as f:
  for n,line in enumerate(f,1):
   if n in targets:
    lines.append(line.rstrip(b"\n"));mapping.append((name,n))
    try:parsed.append(json.loads(line))
    except ValueError:parsed.append(None)
   if n>=max(targets):break
# Findings stay only in memory; never persist or print candidate secret values.
r=subprocess.run(["nice","-n","19","/home/dw/.local/bin/gitleaks","stdin","--report-format","json","--report-path","-","--log-level","error","--no-banner"],input=b"\n".join(lines)+b"\n",capture_output=True)
if r.returncode not in (0,1):raise RuntimeError("gitleaks failed")
findings=json.loads(r.stdout)
def paths(value, needle, path="$"):
 if isinstance(value,str):
  if needle in value:yield path
 elif isinstance(value,dict):
  for k,v in value.items():yield from paths(v,needle,path+"."+k)
 elif isinstance(value,list):
  for i,v in enumerate(value):yield from paths(v,needle,path+"[]")
result=[]
for f in findings:
 i=f["StartLine"]-1; secret=f["Secret"]; locations=list(paths(parsed[i],secret)) if 0<=i<len(parsed) else []
 classification="unresolved"
 if locations and all(p.endswith(".encrypted_content") for p in locations):classification="ciphertext-pattern-not-plaintext-credential"
 elif re.fullmatch("[a-f0-9]{40}",secret):
  p=subprocess.run(["git","cat-file","-t",secret],capture_output=True)
  if p.returncode==0:classification="verified-git-object-id"
 elif re.fullmatch("[a-f0-9]{64}",secret):classification="sha256-shaped-needs-reference-proof"
 # Emit only structural fields and candidate hash; do not expose the candidate itself.
 result.append({"rule":f["RuleID"],"file":mapping[i][0] if 0<=i<len(mapping) else None,"line":mapping[i][1] if 0<=i<len(mapping) else None,"locations":locations,"candidate_length":len(secret),"candidate_sha256":hashlib.sha256(secret.encode()).hexdigest(),"classification":classification,"alphabet_hex":bool(re.fullmatch("[a-fA-F0-9]+",secret)),"match_prefix":f["Match"].replace(secret,"[REDACTED]")[:120]})
(root/"archive-candidate-classification-initial.json").write_text(json.dumps({"original_count":len(original),"rescan_count":len(result),"findings":result},ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"original_count":len(original),"rescan_count":len(result),"classes":dict(collections.Counter(x["classification"] for x in result))}))
for x in result:
 if x["classification"]=="unresolved":print(json.dumps(x,ensure_ascii=False))
