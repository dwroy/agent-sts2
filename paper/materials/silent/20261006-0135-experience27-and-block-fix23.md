# 01:35 完成事件：静默经验第二十七次增量与 S1.fix23

记录时间：2026-10-06 01:40 CST。只机械核实实际提交和自测结果，不另设内容审核。

- 经验调度批次 `20261006-010656-experience-update`，学习者目录 `learner/runs/20261006-010657-experience-update/`。来源 `9YT51CK8RC39` SILENT A7 和旧33局复算；源 `bff7329f4ce6757933e76d8e7409079a88f08156` → 实际合入 `ce1864a00a18db651ef179b403b40e83db0395e4` → 发布 `0c5174f16fbb08539f13fbd307525144e9c80f1a`，唯一 `S1.exp27` 指实际合入。新增2、更新8、退役0，active95→97，53903→55443字；手写知识和生成器未改，A8/A9实际样本0。原第二十七节全文与11条 learner proposed 归档，原账本行内容和全部历史保持，未直接改写账本。ship只对应经验文本，不冒记完整模拟器机制已实现。
- 修复调度批次 `20261006-010656-fix-batch`，学习者目录 `learner/runs/20261006-010657-fix-batch/`。新源 `526b71cc316bc1824b76500b7003a9c02a725b60` 仅 herdr 测试和固定假CLI：同步等待窗格与登记表都删除再断言，假CLI固定延迟600ms；保留原空表、输出、退出码断言，生产脚本不改。撤测试修正1失败/恢复1通过；旧00:44失败、回退、同树复测历史保留，根因已有学习者复现修正，未删除历史队列。无对应bug-infra，不新建台账或独立行为版本。
- 修复实际代码合入 `df557706c395046f188623ea2d89340a20fc95ab` → 发布 `bf63ab407b647a10bbae156fe05f6741d1fe4eb4`，唯一 `S1.fix23` 指实际合入；包含前批 `20261006-004301-fix-batch` 固定源 `779c954876d56d08dab92f89f27345c9788e3d87`。0130证据 VLV17NUSFS61 SILENT A7 F48第6次T5、Z6CFLDR3N4SB SILENT A7 F48首战T10；净损题重复扣已有格挡修正，学习者固定回归撤源3失败1通过/恢复4通过。共用算术改变铁甲已有挡单行动题，原因是原题面重复扣已有格挡；零挡等价。整回合求解器、药水与策略不改，不据题面修正宣称胜线。
- 上述源/实际合入/发布均核实为live祖先，知识刷新 `0c5174f16fbb08539f13fbd307525144e9c80f1a` 的上一刷新33d75ef7保留，fix合前/合后所有knowledge blob相同。01:22取锁busy交接和本轮manual兜底已由学习者继承合入完成；不再整枝合移动codex-dev、不重合旧源、不增第二个S1.fix23。
- 经验源/合后 tsc0、181文件2038例vitest0，fix源/合后 tsc0、182文件2042例vitest0，学习者均报告首过无重跑。完整沙箱外检查两批 checks_pending=true，等待各自 learner-checks，不能把沙箱通过或经验.26旧完整检查借记为本批完整通过。004301原merged=null/预检冲突与运维busy历史保持，前批独立补测依原交接请求，后续结果再确认。
- `/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 134 item(s), 0 problem(s)`。后续11项经验按S1.exp27登记，0130独立按S1.fix23登记，均经ledger.py/by=ops，保持first_run/prior/repeat、0133勘误和0114/0115旧上线。没有Roy新待定，不停对局/调度，不运行play。

`learner/runs/20261006-010657-experience-update/test-source.log`：489字节，SHA256 `84f0b2a95abf22a5bbf1cad864622d96b6f0c8b7753af2c2d261d345adab1602`。

```text
RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  180 passed (180)
      Tests  2027 passed (2027)
   Start at  01:16:44
   Duration  229.55s (transform 6.97s, setup 9.06s, import 22.13s, tests 861.23s, environment 19ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/exp/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  01:20:34
   Duration  1.56s (transform 1.17s, setup 293ms, import 1.11s, tests 51ms, environment 0ms)
```

`learner/runs/20261006-010657-experience-update/test-live.log`：492字节，SHA256 `a0191ed0a50ae8ae801e18ea27cc35e0b358f68ff3aa01e4874ad05bc485c285`。

```text
RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  180 passed (180)
      Tests  2027 passed (2027)
   Start at  01:22:24
   Duration  220.23s (transform 6.77s, setup 11.03s, import 24.85s, tests 821.63s, environment 19ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  01:26:05
   Duration  1.43s (transform 1.09s, setup 281ms, import 1.01s, tests 42ms, environment 0ms)
```

`learner/runs/20261006-010657-fix-batch/source-sandbox.log`：501字节，SHA256 `0b999da6fa6e1a589a7754e87bb42e33e9b4dcc935dcfceca21fccf9e286d137`。

```text
RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent


 Test Files  181 passed (181)
      Tests  2031 passed (2031)
   Start at  01:11:48
   Duration  263.15s (transform 6.40s, setup 9.24s, import 22.08s, tests 994.56s, environment 20ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  01:16:12
   Duration  1.69s (transform 1.27s, setup 317ms, import 1.19s, tests 55ms, environment 0ms)
```

`learner/runs/20261006-010657-fix-batch/live-sandbox.log`：491字节，SHA256 `72771e930ceaeb9b1c7962ce94d4171a8131032ec22bf705f961899bc47877ca`。

```text
RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  181 passed (181)
      Tests  2031 passed (2031)
   Start at  01:26:08
   Duration  225.34s (transform 6.26s, setup 8.79s, import 21.36s, tests 846.23s, environment 19ms)


 RUN  v4.1.11 /home/dw/Projects/agent-sts2/.worktrees/live/agent


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  01:29:54
   Duration  1.49s (transform 1.13s, setup 278ms, import 1.06s, tests 43ms, environment 0ms)
```

- 2026-10-06 01:45 本轮归档提交 `025d70e1470bf9a80bb1c2eac4d15f851f0f72ac`，main固定发布集成 `b70378edafabd9e21a34334ed13c2e5720941795`。逐项源码/测试blob等同已测fix发布 `bf63ab407b647a10bbae156fe05f6741d1fe4eb4`/树 `ab888de781e976ce69f6cb96eae6a06f91266fae`，988项code blob核对、2065项其他main文件保留；未修改live。只同步已测代码，没有重新审核或重复相同源码测试。
- 11项经验原proposed及11条ops shipped归档，0130原proposed前轮已归档、本轮追加独立S1.fix23 shipped，共12条CLI/by=ops更新；`/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 134 item(s), 0 problem(s)`。first_run/prior/evidence/repeat不变，0114/0115等其他条目未更新；herdr纯测试没有新bug-infra/行为版本，S1.fix23仅由重复扣挡产生行为改变。
- 静默学习曲线已刷新。01:29旧pending与本轮manual待办因学习者实际继承合入关闭，不重跑旧/tmp恢复脚本。新经验和fix两批完整外部检查已由调度器运行（checks_pending=true），本轮不重复请求它们、不等待或冒记通过。
- 依旧交接已于01:44运行 `bash ops/codex-ops-do.sh learner-recheck 20261006-004301-fix-batch` 请求前批0130独立完整补测；请求端仍在执行，回报文件 `/tmp/sts2-0135-block-recheck.log`，最终状态及固定树结果交后续learner-checks，不提前声称完整通过，不借他批成功。原批次merged=null/冲突、运维取锁busy、herdr原失败/回退与旧Inferno/TMPDIR失败全部保留。无Roy新待定，不停对局/调度、不运行play。

## 2026-10-06 02:01 三批完整外部检查确认（02:00事件）

三份独立完整检查均由调度器执行，tsc + vitest exit0；固定发布 `bf63ab407b647a10bbae156fe05f6741d1fe4eb4`、树 `ab888de781e976ce69f6cb96eae6a06f91266fae` 已核对git对象和main/live祖先。每份均233文件通过、2850例通过、2例跳过，共2852例，逐批日志及调度器fallback映射如下。

- `20261006-010656-experience-update`：`ops/codex-ops/learner/20261006-010656-experience-update.fallback-ab888de781e976ce69f6cb96eae6a06f91266fae.checks.log`，60470字节，SHA256 `3e629ad7ae1065d91c5e090393b67c9622452d10bf2eccc3e68872eed9754cb4`。

```text
Test Files  233 passed (233)
Tests  2850 passed | 2 skipped (2852)
Start at  01:30:20
Duration  502.74s (transform 6.53s, setup 10.58s, import 28.86s, tests 939.66s, environment 25ms)
```

- `20261006-010656-fix-batch`：`ops/codex-ops/learner/20261006-010656-fix-batch.fallback-ab888de781e976ce69f6cb96eae6a06f91266fae.checks.log`，60139字节，SHA256 `af1da0329139e64e648de4b341b2985d956d18d6bb58fdcacd70168b86502f88`。

```text
Test Files  233 passed (233)
Tests  2850 passed | 2 skipped (2852)
Start at  01:38:44
Duration  509.10s (transform 6.18s, setup 9.90s, import 28.03s, tests 954.61s, environment 21ms)
```

- `20261006-004301-fix-batch`：`ops/codex-ops/learner/20261006-004301-fix-batch.fallback-ab888de781e976ce69f6cb96eae6a06f91266fae.checks.log`，59225字节，SHA256 `7ccc8e041920ef7f90adfb077702dc06ee9965542c66dd64cc62bbf33b4e607d`。

```text
Test Files  233 passed (233)
Tests  2850 passed | 2 skipped (2852)
Start at  01:47:16
Duration  509.34s (transform 11.06s, setup 11.03s, import 32.31s, tests 949.77s, environment 21ms)
```

前两批调度器done/rc0/checks_pending=false；004301原state=failed、merged=null仍保留为当时预检冲突未上线的历史，本次独立fallback_checks rc0确认已继承合入后的固定树，不回改原回报或失败状态。01:44请求端 `bash ops/codex-ops-do.sh learner-recheck 20261006-004301-fix-batch` 已exit0，原回执 `/tmp/sts2-0135-block-recheck.log` 与第三条正式事件映射一致。

01:35两批完整检查和前批0130独立补测三项待办均完成。S1.exp27/S1.fix23、main同步b70378ed、11项经验与0130共12条shipped已在前轮完成，本轮不重复合入、版本、账本更新、检查派发或论文刷新；旧herdr/Inferno/TMPDIR失败、回退、busy/预检冲突历史全部保留。其他未到达复盘/台账及在线刷新不随本轮提交，无Roy新待定，不停对局/调度。
