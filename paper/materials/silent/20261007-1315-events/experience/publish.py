import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*a):return subprocess.check_output(['git','-C',str(LIVE),*a],text=True).strip()
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp72';assert not any(v['name']==name for v in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=f'Codex学习者经验自测后上线：静默经验{C["old_version"]}→{C["version"]}，源{M["source_commit"]}→实际live {M["merged"]}，eval {name}。来源notes/lessons.md:5401 W7BHM8U02RKG SILENT A10及稳定血清勘误、旧89静默局；条目'+','.join(C['updated'])+'；证据/进阶见经验与historical-facts.json，账本'+','.join(L['proposed'])+f'仅CLI proposed/check0，交运维据experience-done核实际登记shipped。新增0更新9全补非药水证据、只改数字0退役0，active139/{C["chars"]}字。旧七数组/血档/源节点/回血/SL一致，新90局1348房80实死。普通触媒13+12毒结算、尖啸临时减力/吸取与蛇咬负力量施毒、面包/古茶具时序、同盘少6毒伤同损15及能力实际建立分账。源/合后沙箱tsc和vitest0，无源码/生成器/手写知识/其他角色/新用药规则改变；其他刷新blob保持。主目录第72节与账本只追加交调用方提交，handoff-ops.md与完成JSON交调度器通知运维及完整外部检查。不停对局、不运行play、不推送。'
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验{C["version"]}；W7BHM8U02RKG A10及本角色历史；增0改9退0，139条{C["chars"]}字，触媒/减力/施毒与面包时序、SL及路线回血观察；源与合后沙箱tsc/vitest0。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check');p=O/'release.patch';p.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(p)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.18 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
