[watcher] 更新精确检查终局：上一版459699的full返回1，尚不可发布；已保留原件，仅修一处测试超时并启动新树的唯一完整检查。

18:57开始的原runner907918已结束：tsc0，637文件中636过1败；6012项中6009过1败2跳。唯一失败为ops-mod-state固定HTTP轮询测试，child status=null且耗时约5.9秒，疑似命中5秒子进程watchdog；原日志未捕获error，不能当作已证实ETIMEDOUT。同项立即定向复核通过，不替代失败full。原6项版本/前件错配均已通过。失败日志、JSON和独立事后输入核对均保留，不改写失败。

只在测试中将child timeout 5s调为10s并抛出spawn错误，保留全部断言和固定fixture；相关37项定向测试通过。新tree `bb1c16b0124be3e3fe09a59dae98043df1064675`，29交付叶（prepared-v2.json），相对原失败9e53仅4测试叶有差，运行源码及462知识快照不变。19:25:29开始唯一full，runner1026528/start9285804、full1026649，tsc0；nice19单worker，无发布锁，2488冻结输入。新full未通过前不提交发布回执，请ops不要发布459699或重复同源full。

原件 `.worktrees/integrator-high40-compat-20261022/.artifacts/high40-compat-20261022/full-timeout-compatible-first/`；主材料 `paper/materials/20261022-high40-integrator-compat/`。live与Roy暂停由原ops保持；后序依赖和顺序不变。
