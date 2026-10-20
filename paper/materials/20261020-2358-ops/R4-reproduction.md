固定输入SHA256：915fb8eba10e5de59d33f38e9e7b05c4aa7ab9289f8ab810907c6e655eee79e8
固定源码：ab1f2561832b2909233bc55e52842f1bf726e5a0 / tree 760b957550ab19beec32894fcee217bc3fe020ac，diff为空。

仅使用封存输入，不重建共享logdb，不读取后来结束/在途窗口。单进程计算nice19；下列命令逐条顺序执行，不并发。run_checks.py作为父进程与一个子进程，最多两进程，子进程继承nice19，注入环境不含真实模型/游戏配置。

```bash
nice -n 19 python3 /home/dw/Projects/agent-sts2/learner/runs/20261020-231417-9397e12f-7784-4fc4-b61f-becc95226a5b-v6-reflex-distill-r4/build_inventory.py
nice -n 19 python3 /home/dw/Projects/agent-sts2/learner/runs/20261020-231417-9397e12f-7784-4fc4-b61f-becc95226a5b-v6-reflex-distill-r4/statistics.py
nice -n 19 python3 /home/dw/Projects/agent-sts2/learner/runs/20261020-231417-9397e12f-7784-4fc4-b61f-becc95226a5b-v6-reflex-distill-r4/run_checks.py final
```

严格CLI原命令及实际环境、输入SHA、stdout/退出码以validation-final-receipt.json为准。统计公式、每机会原始分子/分母和每局CR1贡献在pending/audits，自由度G−1；confidence/interval由冻结原生源码复核。

freeze.py/supplement.py只用于本轮最初封存；已经封存后不重跑以免改变元数据时间戳。原始证据按每行source/off/len/sha256追溯，冻结压缩投影已删除重复agent_view，未将中文卡牌描述当事实或先验。compact目录只是可重建投影，不是新的证据来源。

此前失败保留在validation-preliminary*、pending/rejected/draft-before-strict-check.json和rejected/native-fixture-first；不可把最终空草稿的通过冒充被拒3条通过。所有合成fixture都显式synthetic，不计科学分母。
