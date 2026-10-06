import sys,json
for line in sys.stdin:
 d=json.loads(line)
 if not d.get('label','').startswith('selection/'):continue
 if '华丽收场 scores' in d.get('rationale','') or d.get('expect',{}).get('option',{}).get('id')=='GRAND_FINALE':
  print(json.dumps({k:v for k,v in d.items() if k not in ['fingerprint','questions','answers','latency_ms']},ensure_ascii=False))
