# #63 学习 tab sessions 映射封存

候选基于 main `062cd855366bd0a8d3f4f8b61286e98990db4058`。只修学习 UI 封存及回收证据读取，不改变游戏行为、知识、发布、账号配置或凭据。开发未操作 live/STOP、生产 seal/recover/tick、关闭 tab、运行库或其他会话。

## 根因与实现

101312 与 114312 的原回执 rollout 经过已登记 codex1 隔离账号的 sessions 软链，原 `files → safe_path` 拒绝，正常学习完成和 UI 封存因此分账。原失败分别见 #20 评论 [6392558810](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6392558810) / [6393284318](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6393284318)。

候选保留通用 safe_path，只为原 receipt/result 的 rollout 增加只读入口：注册 profile、固定同账号目标、原日志 SHA/launch 与原 pane/session/rollout 绑定均核同后，绕过 link 本身，以逐层 no-follow 的文件描述符读取精确目标。原生 verifier 新增可选 source 参数，复用同一份读取字节，不改 receipt 路径，不降级原核验。

seal 保存 link、profile、叶子和父目录身份及内容 SHA。正常 seal、显式 recover、调度器自动恢复、关闭前证据复核都使用相同入口，拒绝未知/换链/越界/异账号/线程/不完整 native 等情况。实际进程、pane、空输入、额外子进程、不确定关闭回执门保留。旧普通路径和已封存记录继续由原流程核验。

## 测试与原件

- `ops/tests/fixtures/issue63-seal-failures.json` 是两次原失败的固定脱敏投影，保 batch/date/path shape 和原 receipt SHA；任务文本/结果/账号目标根/UUID 为固定合成数据。两例均先由原通用守卫复现拒绝，再走 seal/reclaim 和幂等读回。夹具不是游戏知识。
- 映射负例覆盖 profile 缺失/错账号/软链、目标错误、嵌套/叶子软链、错 session/turn/pane、缺 binding/终态/完整末行、产物变动、活 native、忙前台、草稿及额外子进程。额外覆盖核验中与关闭前换链、恢复重试保原 seal；原 suite 保留普通路径、旧 seal、lost-ack 不重关等边界。
- 真实 shell wrapper 调用真实完成回执与 seal 逻辑，只有模型/finish 回调和 Herdr 现场用固定适配器；核 wrapper PID 退出，再用全新 Python 进程 tick/reclaim/tab 缺席及第二次 tick 不重关。原 learn.json 与产物保持。
- `original-native-readback.json` 保存两原样本候选字节核验；`original-seal-readonly.json` 是完整 seal_proof 只读探针：5 份证据、原进程退出、实际 pane/空输入全部通过，state/host/TUI 读前读后 SHA 相同。探针绑定候选两叶，未落 seal、未 close；可用 `verify_originals.py --root <原运行根> --candidate <本候选树>` 重核。
- 后继 121312/pFH 沿本项接续。ops [6393556328](https://github.com/dwroy/agent-sts2/issues/63#issuecomment-6393556328) 的原 readback SHA `8e57cc4c068f9d2f89e027af67af0c521ccd88523cc20aa2e3c098b756abb65d` 已独立核同；候选完整 seal_proof 只读通过，见 `successor-121312-readonly.json`。原状态 done/rc0，通用路径仍拒绝，实际 seal/回收待原 ops。
- 主管 [6393659210](https://github.com/dwroy/agent-sts2/issues/63#issuecomment-6393659210) 已实读：三例同一固定交付，原集成员接最终组合，原 ops 修后逐项真实回收；符合条件的立即释放，不等其他样本或长期研究。未封存或缺证的项保留并逐项回写原因/下一步，不另建任务。

开发中新增真实 wrapper 测试先得到 rc2（误用要求独立工作树的 strategy 参数），改用普通 experience wrapper 后 rc75 两次，依次定位原旧夹具使用非标准 receipt 路径、缺 seal 必需的 agent-name 绑定；只修夹具接线后通过，未削弱生产断言。首败留在本记录，不冒称生产缺陷。早期定向 128/111/170 项分别通过；最终检查回执以本目录日志和 manifest 为准。

最终自测：

| 检查 | 实际结果 |
|---|---|
| 生产 tsc（sandbox 第一阶段） | exit 0 |
| sandbox 首轮，单 worker / nice 19 | exit 1；634 文件/5874 项通过，1 文件/1 项失败，1267.27 秒 |
| 首败原因与恢复 | check-imports 仅缺稀疏未展开的基线 `paper/materials/issue29-brain-speed/results.jsonl`；从指定基线 062cd8553 恢复原 blob，未改字节或源码，SHA/字节数见 fixture-restoration.json |
| 恢复后的 import + learner-tabs + native/wrapper receipts + wrapper 接线定向 | 4 文件/6 项通过，exit 0；底层执行固定 Python suite，见 targeted-final.log |
| sandbox 原第二阶段 paths | 1 文件/11 项通过，exit 0；见 paths-final.log |

原整轮首败保留为失败，不合并计数冒称一次完整绿，也没有另开重复的开发 full。源码与固定测试输入 SHA 从首轮到复验保持；恢复的历史输入本就在基线 Git 内。该输入应由原集成员按同一基线显式展开，再进行本候选的唯一最终发布组合完整检查，结果仍待其实际回执。

## 核收与运行接续

生产部署闭包仅 `ops/learner_tabs.py` 和 `ops/learner_tui.py`；两叶必须配套。正常 wrapper 及 stall tick 从宿主 ROOT/OPS 运行，native verifier 从同根加载。其他实例若有不同 OPS 根，也须由 ops 沿原发布流程读回该根两叶 SHA；不凭开发树或 main 祖先声称 ROOT/LIVE 已安装。其余 diff 是固定测试、合同及交付材料。

原集成员已在 [#63 intake 评论](https://github.com/dwroy/agent-sts2/issues/63) 接入交付核验队列，并明确交付后接固定候选及唯一最终组合 full；本会话已用进展评论请求该窗口。须鲜核届时 ROOT/LIVE/知识/依赖输入，不借 #59 旧 full 代新差量。开发 sandbox 是本树自测，不代最终发布组合完整检查。

通过后原 ops 尽快沿原入口逐项核两原样本与 121312 后继：先实际身份/空输入/进程退出，再 recover-seal 只读、核准后 --apply，原 stall tick 关闭并读回 tab 缺席/event done/host 精确映射清除。未知操作结果先查权威现场，禁止盲目重放。不改业务行，不重学/重发/重发布，原树/分支/日志/产物及未完成学习和效果要求保留，实际删树仍走 retention。命令和完整回退见 `docs/learner-tab-sessions.md`。

回退只配套恢复两生产叶，保留原 journal/seal/失败及全部证据；旧代码继续保留软链样本。无游戏发布号、游戏知识/铁甲战士行为变化。#60/#62 与科学父项独立继续。
