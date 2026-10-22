from pathlib import Path
import json

R = Path('/home/dw/Projects/agent-sts2')
B = Path(__file__).resolve().parent
f = json.loads((B/'full/checks.json').read_text())
c = json.loads((B/'candidate.json').read_text())
m = json.loads((B/'main-integration.json').read_text())
t = json.loads((B/'main-selfcheck/vitest.json').read_text())
remote = json.loads((B/'main-remote-readback.json').read_text())
assert f['state'] == 'passed' and f['inputs_unchanged']
assert m['candidate'] == c['candidate'] and remote['sha'] == m['main']
v = f['vitest']
material = c['material']
r415 = json.loads((B/'r415-readback.json').read_text())
link = f'https://github.com/dwroy/agent-sts2/blob/{m["main"]}/{material}'
body = f'''[watcher] #36 R414 精确 R3 与 #44 修复的唯一完整检查通过，已合 main，交原 ops 按原发布门接续。

按主管 6345466773，只新增原 dev 的 Boss-home 测试夹具 `f0a967266` 和 #44 测试修复 `110cbd8e`；原 R3 运行代码保持不变。实际 R414 基线 `{f['base_live']}`、受测树 `{f['tree']}`。tsc 0，无筛选 full {v['files']} 文件/{v['passed']} 项通过、{v['pending']} 跳过、0 失败；{f['input_count']} 枚举输入前后逐 SHA 相同，nice 19、单 fork、禁止文件并行。后续 Python view 15+1 skip、TUI 18、新进程生产入口 2 项通过。

main `{m['main']}`（候选 `{c['candidate']}`）已通过 Windows SSH 推送并核远端 SHA；保原 #33 MCP/Board 消费者、原断言、#27 新五条及并行记录。main 另做 tsc、{len(t['testResults'])} 文件/{t['numPassedTests']} 项定向、Python boss 6/view 15/TUI 18/shell 4；只有这一轮 R414 full，不冒称 main full。原失败 `35be70748`、两项失败与原始日志保留，新结果另存；#44 不据重跑声称历史唯一根因或长期稳定。

精确交付包含 R414 31 叶 R3、12 叶测试修复，以及 #40 三叶最小前件，逐叶列预像/受测 blob/SHA；不能整包合 main。完整 #33 的六叶与共享协议差异继续延期。#40 包装器沿 R414 原 12 项只新增独立生产入口，不带 main 的旧额外依赖。468 份知识仅供冻结检查，禁止回覆生产；ops 锁内核实际最新 live，保所有后续知识/策略/catalog 并核真实消费者。

在途期间已实际发布 V6-R415 `{r415['actual_live']}`；#40 三叶与受测树逐字节同，已属 live 前件，不要重放。快照读回发现 {len(r415['changed_knowledge'])} 份自然知识与冻结 full 不同，详见 r415-readback.json；本轮 full 输入不改，不据此冒称在新数据树跑过 full。ops 按实际 R415 接 31 叶 R3 与 12 叶测试修复，保最新数据和已有编号。

原序 #40 热修 → #36 → 完整 #33+#26（含 R413 session 启动）→ #42 工具余项 → #35 → #28 → #37（#37→#20）保持。full 窗口已释放；本角色未发布、未分号。发布后由原 ops 按原门启用 brain view/learner 交互，首自然局验 session/high、实时滚动/换局标题，下一原学习批验 TUI/原任务线程/提示与档位/产物/处置权/退场；失权或不确定仍保 75/stopped=false。#36 自然验收、#40 自然刷新资源/训练/模型消费者、#27 实际 live/首自然命中/父要求和正式 ACK CLI 兼容阻塞保持。

[集成报告]({link}/report.md)；[精确交付及补丁]({link}/delivery.json)；[唯一完整检查]({link}/full/checks.json)。
'''
body44 = f'''[watcher] #44 测试修复 `110cbd8e` 已与 #36 夹具 `f0a967266` 在实际 R414 合成同一组合，唯一完整检查通过并合 main，技术核验通过，交主管核收。

受测树 `{f['tree']}`，无筛选 full {v['files']} 文件/{v['passed']} 通过/{v['pending']} 跳过/0 失败，tsc 0、{f['input_count']} 枚举输入前后同；main `{m['main']}` 已推送核同，main 仅做上述兼容定向、没有第二轮 full。全部 10 个 #44 测试叶与源交付 SHA/R414 前像核同，没有改生产算法、450ms 预算或宿主性能阈值。计算时钟/宿主时钟分开、真实 449/450/451ms 对照、缺失/损坏模型与 204 行业务断言保留；源 red 探针与错误试跑分账原件保留。

#40 首败、#36 原 F2 table undefined 和旧 Boss-home 失败原件均保留。历史缺少内层异常的记录仍不能认唯一根因，本次绿不等于长期稳定；后续若有新证据沿本 issue 追踪，不加第二重发布门。#36 的实际 live/自然 TUI 验收仍由原 ops 接续，未据测试通过称已发布。

[报告及原件]({link}/report.md)；[完整检查]({link}/full/checks.json)；旧失败保存在 `paper/materials/20261022-issue36-r414-integrator/full-failed/`。
'''
for issue, text in ((36,body),(44,body44)):
    (B/f'delivery-{issue}.md').write_text(text)
    (B/f'delivery-{issue}-request.json').write_text(json.dumps({'body':text},ensure_ascii=False)+'\n')
print('handoff bodies prepared after verified main push')
