import json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'));source=(O/'commit.txt').read_text().strip()
assert M['merged'] and M['test_rc']==0 and L['check']==0 and M['untouched_knowledge_blobs_preserved']
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(name):
 s=(O/name).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',s))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',s))))
st=tests('test-source-final.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log');assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
assert git('hash-object','knowledge/characters/silent/experience.json')==subprocess.check_output(['git','-C',str(ROOT/'.worktrees/exp'),'hash-object','knowledge/characters/silent/experience.json'],text=True).strip()
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
v=json.load(open(LIVE/paths[1]));name='S1.exp57';assert not any(x['name']==name for x in v['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.2→.3，源{source}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5195/5201的DPYF2BAA3DKT、CRK2HNYKSCZC SILENT A10及静默第五十七次增量、本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，首证/先验/claim/旧version/repeat保持；0200机制与0199纯bug分账，0199不入DS或重置状态。交运维据experience-done及learner/runs/20261007-021220-experience-update/handoff-ops.md核实际合入后登记shipped，不另设审核。'
 +'旧68局七数组/血档/节点/回血/SL重算一致，新70局1101房60实死，A10三十局387房30实死；MCCK2602T1SR仅进数字。新沙漏六次0赢、首末前9次未插入的抽牌ID相同、之后生成/探索/动作同变；历史真正重打64场291试19赢/A10 31场150试7赢。'
 +'触媒2＋1合3，末T4—7的12/21/23/29毒兑现42/78/86/110合316＋其余102仍117/535；余像四牌4、预判临时2敏使防御5→7，11挡对32损21、次轮临时敏撤回，末9挡对26＋两9凋萎需35、28血差7。头骨冒泡19→29毒真实但未发生25毒不预支；暗影末试未施/未得步法。LRN0HPZ0FZS1 A0重放余像13→15/原始计数8→9与DPY A10防御0→24/计数4→5作为两窗口观察，代码跨轮计数缺口留独立0199。'
 +'CRK F11脆弱防御5→3/扫腿11→8合11，九击1逐击弱为0、斧手13仍杀2血；滚石轮初基础5/10被敌挡后实扣7/14，末15层未兑现。DPY棱柱T3同笔药瓶两题覆盖只计一次省9血/少9题面伤及余毒，旧3毒＋消亡9实扣12，八轮净损59胜，原线未实打。DPY九火回283、末74血六败；CRK锻造39血、B2胜率0.728不保走廊，F11投影35/p75 27、实际11、下一火未到。无未执行路线/构筑/休息/护栏原线因果，无新用药规则。'
 +f'新增1更新19（15补证/1只数字/3压缩）退役0，active127→128、56154→{C["chars"]}字，高61中39低28；开工萎靡/金刚杵/女王压1233至54921，所有原含药分句逐字保持，A8 {C["applicable"]["8"]["entries"]}条{C["applicable"]["8"]["chars"]}字/A9 {C["applicable"]["9"]["entries"]}条{C["applicable"]["9"]["chars"]}字。切片240配对中位{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。'
 +f'源定稿tsc0/{st["files"]}文件{st["cases"]}例/vitest0；初轮/中间轮期间收紧SL比较并同步旧步法n及_about，冻结blob后第四轮定稿完整重跑通过，前前三轮不作定稿凭据、非失败超时重跑；合后tsc0/{lt["files"]}文件{lt["cases"]}例/vitest0，'+('首轮失败后按任务重跑通过、原日志保持' if M.get('test_first_rc') else '首轮通过')+'，完整外部交调度器。'
 +f'刷新提交{M.get("refresh_commit")}、合前{M["base"]}，知识不同blob冲突0、其他知识blob保持；{('decision-log仅双方追加历史union且逐行有序保留。' if M.get('append_history_union') else '锁内预检/实际合并无冲突、历史原文保留。')}抽数初稿遗漏TD1重启标注、计数路径/SL字典解析/重复执行脚本失败及修正原文留存，非生产代码失败。无源码/生成器/手写知识/铁甲知识改动，不重建、不停对局、不运行play、不推送；主目录变更节/账本仅追加不提交，交调用器完成事件通知运维。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
v['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.3；源{source}；DPYF2BAA3DKT/CRK2HNYKSCZC A10及本角色历史。增1改19退0，active128/{C["chars"]}字；重放效果/原始计数观察、毒触发/余像/临时敏捷/逐击虚弱/脆弱/滚石与路线血池，SL首末仅前9次干净抽牌可比；无新用药规则/源码变更，旧68局重算一致，源/合后沙箱tsc/vitest0；22项proposed交运维核实际合入登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check');p=O/'release.patch';p.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(p)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.3 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
