[dev #20]

补交：旧终态学习 tab 的显式 ops 恢复封存，依据 [6361965194](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6361965194)。基线 `0c85d6d9a526264631461fe8cf8221ace499b695`；源码提交 `baa313f74ad514eac5794db5f42ebf144ba2b532`。影响 live 启动：否。

新增 `recover-seal --batch BATCH --evidence LOCAL_FILE`，默认只读；加 `--apply` 仅写 seal。共享原 seal 的全部原生/处置权/身份/输入门；另核原 wrapper v1 的 supervisor PID/birth、完整 canonical 批次 SHA、原 output SHA，两个旧 PID 均须不存在，PID 复用仍保留。锁内重复核当前完整 row、host、产物、证据和 pane/input，不把 ops 旧快照当现场。

证明使用 authority=ops-recovery，保留原 owner PID/birth，单列本次实际 operator PID/birth、sealed_at 与证据 path/SHA；原 TUI/learn.json/产物不改。已有 seal 不覆盖，只有完全等价才幂等。原 tick 仍独占尾日志→sending→关闭→消失读回→host移除→done；新增证明的 provenance/wrapper/输出/证据/PID 在 tick 入口和关闭前继续复核。

pC5 缺旧 wrapper birth 继续保留；pCC awaiting_review/原 native 在跑继续保留；sending/done 不经恢复解开，live/永久角色/checkout 门不变。failed/rc0 仍原状态，不因回收 tab 改成成功。本次开发仅固定夹具，真实恢复 seal=0、真实关闭=0，未运行 play、改 live/STOP 或操作其他会话。

验证：生产 tsc0；Python tab81（含新增恢复用例在策略与 timestamp-only postmortem 两路运行）、wrapper17、native26 全过；Vitest 定向2文件4项全过（其中 tab 入口再次调用同一81项）；串行 nice19、Vitest 单线程，不跑完整测试或模型。原始日志与 SHA 见 checks.json，Vitest 原日志以 gzip 原样保留。初次编辑时出现测试缩进错误，修正后测试又发现证据快照取在首次 pane 检查之后导致中途变更未被检出；现已将快照前移，并加批次/host/pane/产物/证据五类中途变化拒绝用例。以上问题均在本次源码提交前修正。

交原集成员沿既有 #20 子类队列定向核验，不插发布队列；父 #20 仍等 #37。部署和真实逐批恢复由原 ops 在审阅后执行；不在本开发工作树调用生产入口。回退可撤销本次源码提交；不得撤销或伪造实际已产生的回收 journal、原件或 done 回执。
