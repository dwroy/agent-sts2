# #20 回收发布历史门独立核验：退回

源码 `23b336a011bbdc4d26a6bd1224b9fe70c3652984`；隔离当前 main `42656aaf5b86c856dc97228703b414f54955229a` + 四叶补丁，anchor `8f1fe65fcff5e4184b5ed2f8502cdea9888f3ae2`，tree `f4b74734f541012bc2749ab14f361611292c6c49`。产品不合 main，不部署。

独立固定反例证明：`historical_publication` 的 `git log <published> ^<allocation-base> --first-parent` 只排除基线祖先，不能排除已经分叉的 live 通道在任务分配前的旧发布。时间顺序由固定仓库构造操作确定，不依赖 commit 时间戳：

1. 共同初态 fixed=1；live 分叉并先发布 fixed=2。
2. main 改 fixed=0，作为新任务 allocation base；来源在此基线上改 fixed=2。
3. 本次任务仅 main 采用 fixed=2，再演进 fixed=3。
4. live 从旧 fixed=2 演进 fixed=3；任务分配后从未再次采用来源 fixed=2。
5. 新门仍接受 main/live；live 的见证恰是步骤1的分配前旧提交。

预期保留为无法证明本次 live 采用；实际返回 accepted。反例见 `preallocation-diverged-live-counterexample.json`，复现脚本 `reproduce.py`（只用临时固定仓库，当前保留的隔离工作树提供被核源码/夹具）。这属于发布准入假阳性；其他 owner/进程/归档门通过后可造成误回收。不能仅靠变更时间戳修剪或把 main 证明算作 live；需原开发补各通道绑定的可靠分配边界，无法证明时继续保留，并新增分叉通道分配前旧叶及补丁回归。

原三棵实际树的误保留也已独立复现：旧门均拒绝，新门分别证明 #47八叶、#46四叶、#49/#55十五叶；main/live pins 前后同，allocation 原件SHA保留。47的live完整逐文件patch-id独立核同 `c7f872f53970031f026abe88b57aa5c4481ec6f6`；这不抵消上述固定反例。只调 acceptance，不调生产 complete/reclaim/plan，三树保持原状。

验证：生产/tools两tsc0，两次定向包装各一项绿，内部Python24+16=40，不重复累加。独立反例确认后主动中止唯一full，原rc143；无完整结果，不称full通过或产品断言失败。2870输入/1688依赖/tree前后同，worker2837415/birth25462962已退、原检查锁独立实核可获得后立即释放。原checks/error/cancellation证据保持，不改写为full0。

#37实际组合8败仍交原开发，九叶未部署；原main6661/0/2保持其原适用范围。V6-R430纯数据发布保留。#20真实24h/私有kit及39/43父均不关闭。待原开发修复后重新提交 review，再协调新的唯一完整检查；本次仅提交核验材料、账本与本角色交接。
