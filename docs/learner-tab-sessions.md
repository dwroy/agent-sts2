# 学习 tab 的 sessions 映射封存（#63）

学习完成/发布和 UI 封存是独立状态。`seal` 失败不改原批次结果，不重跑学习，不补造 done/retired/shipped。普通 `safe_path` 继续拒绝全部软链。

`learner_tabs.py` 仅为原回执的 rollout 提供专用只读入口。普通无软链路径及原 seal 的格式保持兼容。映射例外必须同时满足：

- 原运行根的原 state-dir 下存在 `accounts/<codex账号>/profile.json`，engine/account/learner_home 精确对应账号的 `learner` 目录；profile 与账号目录本身不得经过软链。
- 唯一允许的软链是该目录的 `sessions`，原始 link 文本精确指向操作系统当前用户 home 下 `.<同账号>/sessions`。不使用当前账号选择器、环境中的 CODEX_HOME，也不搜索其他账号。其他布局继续保留待核。
- 原 rollout 为 `YYYY/MM/DD/rollout-时间-原session UUID.jsonl`，原 receipt/result 的 session/turn/rollout 一致。原产物日志 SHA 匹配，且唯一 learner_launch 的 cwd/engine 和 learner_tui_session 的 pane/session/rollout 对应原批次。显式 `params.batch` 必须对应原批次；普通 fix 无此字段时只按下述 #65 合同核验。
- 目标路径从 `/` 开始逐层以 `O_NOFOLLOW` 打开，叶子必须是普通文件；不通过软链本身读取。读取中检查文件身份稳定，原生核验与终态检查读取同一份字节，不改写 receipt 的路径。

封存证明保存原逻辑路径、SHA、profile 内容和文件身份、sessions 软链身份、目标文件及目录身份。封存末尾、恢复复核和关闭 tab 前均重新验证；同目标重建软链、换 profile、嵌套/叶子软链、路径逃逸、异账号/线程、产物变化继续阻止关闭。当前证据只能证明当前映射与登记一致；没有历史 inode 回执时不倒填“从启动起未替换”。

原任务终态、wrapper PID/start 绑定、原生终态、实际 pane、空输入、前后台额外进程及不确定关闭回执门保持。通用路径、账号配置、凭据、原日志、批次绑定及知识发布不由本功能修改。

## 普通 fix 的原启动绑定（#65）

普通 `fix-batch` 模板没有使用 `{{batch}}`，启动器只将模板实际引用的参数写入 `learner_launch.params`；因此原普通 fix 日志合法缺少 `params.batch`。不能补写原日志，也不能让其他任务缺字段时一概通过。

只有字段完全缺席时才检查 `ordinary-fix-v1`：

- 原 label 精确为 `learner-YYYYMMDD-HHMMSS-fix-batch`。原 `learn.json` 同批行的 task 为 fix-batch、learner_task 缺席或同名，无 feature_request/boss_sim；character、pane、worktree 与原 receipt/launch 一致。工作树须为原 wrapper 规定的 `.worktrees/codex-fix-<角色>-<批次时间>`。
- 唯一 launch 的 engine=codex、task=fix-batch、transport=herdr-interactive、cwd 与原工作树一致。params 的 worktree/project_root/character 必须逐项对应原登记，不用当前账号选择器或新派发推断。
- 原日志位于本项目 `learner/runs/YYYYMMDD-HHMMSS-<UUID>-fix-batch.jsonl`；scratch 精确为同目录同 stem，仍拒绝软链和越界。
- 唯一匹配的 learner_tui_session 保持原 pane/session/rollout，并带 receipt 第一项 bindings/submissions 的同一 marker。后续完整原生核验仍验证 prompt SHA、turn 顺序及终态。

显式 batch 即使为 null、空串或错误值也不能退到此分支；不支持的专题/其他任务布局继续保留。封存的 sessions_mapping 只为这个分支新增 launch_binding 证明，原显式 batch 和无软链封存格式保持；恢复、关闭前重核同一证明。原批次 failed/rc0 只表示业务验收失败，不妨碍有合法处置权的 UI 释放，也不因释放改成 done 或入库成功。

#65 交付仅修改 `ops/learner_tabs.py` 生产叶，依赖已部署 #63 的 `ops/learner_tui.py` stream 核验接口；ops 核实际宿主两叶及适用组合后再装新 tabs 叶，不覆盖已冻结 #64 包。沿原 recover-seal / stall tick 接同一原134331样本，逐项鲜核后封存、释放及核 tab/PID 缺席；不重放原 #63 三例。部署和实际回收由原 ops 验收，固定夹具不代真实关闭。不满足门禁仍保留，原树和产物删除继续交 retention。

回退 #65 时将 tabs 叶恢复到部署前固定版本，并保留 #63 配套 verifier、所有失败和新 seal/journal 原件。新分支证明仍会被旧逻辑保守拒绝，不删除证明来重放动作。无游戏行为或知识变更，不分配游戏 release_id。

## 部署闭包与接续

原集成员核固定候选与适用最终组合检查；原 ops 在原调度事务边界同时安装 `ops/learner_tabs.py` 和 `ops/learner_tui.py`。前者调用后者新增的只读 stream 参数，两叶必须配套。wrapper/tick 调用入口、state-dir、根和原批次身份保持，不热换正在封存/回收的进程。

宿主 wrapper 和 stall tick 使用原运行根 `ops/`，原 native verifier 也从同根加载。若实际实例从其他 checkout 调用这两个文件，沿原发布流程把同两叶配套安装到该实例的脚本根；不要为此合入知识数据或改变 live/STOP。实际 ROOT/OPS/state-dir 及两叶 SHA 由 ops 读回，不能用开发树证明运行目录已安装。

对 `20261025-101312-strategy-proposal` 和 `20261025-114312-strategy-proposal`，以及沿本项接续的后继样本 `20261025-121312-strategy-proposal` / `w1H:pFH`，ops 在适用检查通过后逐项重新核 seal 根因、原 wrapper/native 已退、原 pane 身份和空输入，再沿原入口操作：

```bash
nice -n 19 python3 ops/learner_tabs.py recover-seal --root "$PWD" \
  --state-dir "$PWD/ops/codex-ops" --batch <原批次> --evidence <根内实际复核文件>
# 上一步默认只读。实际核准后沿同一参数加 --apply，只封存，不关 tab。
nice -n 19 python3 ops/learner_tabs.py tick --root "$PWD" \
  --state-dir "$PWD/ops/codex-ops" --dry-run
# 原 stall tick 接续关闭；如原 ops 明确执行 tick，去掉 --dry-run。
```

调度器也可在原完成日志唯一匹配、原进程已退时自动补 seal。已封存的批次直接复核；重复 tick 在 tab 缺席时不重复关闭。不确定事件继续保留，先查权威 tab/进程/原回执，再沿原处置流程处理，不能删除事件以重放。回收后核 tab 缺席、原 native/supervisor 退出、event done、精确 host 映射清除；业务状态/产物/树/分支与未完成学习及效果要求继续保留。工作树删除仍走原 retention 门。

主管回执 #63/6393659210 确认三例统一交付、逐项验收：符合条件的立即释放，不等其他样本或长期研究完结；每项回写已释放/仍缺证据及下一步。缺证样本继续保留，具体阻碍沿原主管链裁决，不改绑定或重学绕门。

回退时配套恢复这两个生产叶到部署前版本，保留所有原失败、seal、journal、日志和产物。旧代码会继续保守保留映射路径；不要删证明、改映射或重派学习来绕过。无游戏行为或知识变更，不分配游戏 release_id。
