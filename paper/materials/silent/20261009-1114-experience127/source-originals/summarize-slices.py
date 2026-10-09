import json,statistics
from pathlib import Path
O=Path(__file__).parent
B=json.load(open(O/'slice-before.json'));A=json.load(open(O/'slice-after.json'));rows=[];before=[];after=[];diff=[]
for b,a in zip(B,A):
 assert b['sample']==a['sample'] and b['n']==a['n']==20
 ds=[y-x for x,y in zip(b['sizes'],a['sizes'])];before+=b['sizes'];after+=a['sizes'];diff+=ds
 rows.append({'sample':a['sample'],'before_median':b['median'],'after_median':a['median'],'before_max':b['max'],'after_max':a['max'],'paired_median':statistics.median(ds)})
result={'rows':rows,'before_median':statistics.median(before),'after_median':statistics.median(after),'paired_median':statistics.median(diff),'before_max':max(before),'after_max':max(after),'diff_min':min(diff),'diff_max':max(diff)}
(O/'slice-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in result.items() if k!='rows'})
