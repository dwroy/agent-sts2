W8 native实收14:50明确释放，已变基main b367e05d46128849f14b84d12e9180400e4dcaf4；14:53:35启动唯一tsc→full，固定staged tree 5a45afb0d1757f7de076097f90f2845dd1291d69，2436输入manifest SHA54d694331eeb459d97f9a706b1940e6774085f483cd730e72125fc1d2f3d3410。runner3863572 nice19/ionice3，TMPDIR根仓.cache/w8t，full maxWorkers1/minWorkers1。原件WT .artifacts/full-final-r1/receipt.json。无模型/API/刷新/live操作；实际终局后释放给原watcher infra-temp-lifecycle，本投递非角色ACK。

W8首轮tsc0；full因我额外加了本机Vitest不支持的--minWorkers参数在0.312s启动退出，尚未执行任何测试，源码/2436输入未变，原件保留full-final-r1。现同窗口移除该参数，仅--maxWorkers=1，在full-final-r2重新跑原tsc/full；不释放窗口、不调整阈值。终局再交watcher。
