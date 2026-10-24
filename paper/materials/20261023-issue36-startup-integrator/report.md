# #36 启动环境与迟到原生监督：集成员准入

时间 2026-10-23T20:07:31+08:00。实读 dev6364315463、ops6364152025，以及后续19:52原fix实际failed/rc0记录。只取60300e8bf的learner/lib/herdr.ts、agent/tests/learner-herdr.test.ts。main基线72f3564ed93676e7b990b0e2beb160e100dc4dac，组合eaaf3cf1e86def1684426d3bb0968e8034d8b8be；live基线0f5dfa4726f2f8e20723100eac55e617d3191c19，组合cb5ad79508c2e6eb841dfb179807fded51588276。私有锚点不得整树合入。精确前像、模式、blob、SHA见两份assembly。

隔离环境缺省/空白/dumb TERM设xterm-256color，保留有效显式TERM及原caller环境。读取visible ANSI，Queued follow-up inputs即使有空composer也不能授权新prompt/continuation/退场。原任务提交120秒未绑定告警并只读观察，硬上限600秒，调用者更短截止优先；完整prompt SHA/marker/cwd/native turn仍为绑定唯一门，期间不重发/按键。lease/pane/PID、foreign/human draft、原finished/空fix验收不放宽。旧监督器已退者不自动接管；最终仍走原300秒verify/defer与失权75保留pane门。

main与live生产源码同blobb0b75c1a2ac99d23e3ad0f199cb208705c973c98。main测试叶已有真实子进程退出等待和三条回归，新补丁在两处发生测试辅助函数冲突；手动保留退出等待/三例，并合并queue参数及新450秒/600秒用例。冲突原件、合并脚本和最终SHA保留。live测试叶为开发原blob，main测试叶为合并blob，两者不能混称同一测试树。main tsc0、7文件229过；live tsc0、7文件226过。分别2632/2550个输入SHA前后不变，nice19单fork串行。第一次准备树时可选issue29夹具在live基线未跟踪，准备阶段停止、无测试发生；已据实际树确认选定七文件不依赖该材料，仅在main按原Git实体化。测试输入及依赖均已实体化，空.cache目录为隔离树预备，不改输入或产品。

469份实际live知识在短K→L共享锁内冻结，仅用于受测组合，不合入main或覆盖生产；ops发布须再核最新数据并保留。组合自查递归349份本地源码/1656引用，无缺件；20处动态加载逐项由已读构造解析并核目标实际文件及Git blob/模式。原实时stdio块SHA f584c781dd3dccab5d0f6b16adfd7bc1d3a75bc39c92190ea7a46c2cbaf1f1e5不变，wrapper bash语法0；范围限枚举调用链，不宣称任意外部配置命令完整闭包。新增两叶未增加运行时导入。

开发5原日志与10冻结输入逐份字节/SHA核同，旧源码11条负控失败原日志保留。193545旧PID是TERM=dumb启动确认、submitted=false；ops停止未投递启动后19:43:05同批新PID重启，19:43:10新session，19:44:06–09原生task/context。新旧marker/prompt SHA不同，旧receipt配新native拒绝75；不得把7.5分钟归为旧进程排队。450秒是虚拟时钟回归，不是真实193545持续等候。开发19:47监督存活仅为当时快照；ops19:52fix已自然结束且wrapper canonical failed/rc0，保留而不据native成功冒done。

按主管原裁定只做定向+组合自查，不另开full，原#46 full覆盖相关七文件，新增边界由本次定向验证，不称旧full已覆盖新增测试。仅将精确两叶及证据合main，交原ops按最新live/知识做精确发布；下一自然启动生效，不热切在途会话。main额外测试夹具修复不复制覆盖live其他叶。回退只撤本次herdr增量，保留已有绑定/日志/收尾/知识与证据；回退会恢复旧120秒过早退出风险。自然新TERM、迟到受理、收尾与后批派出仍pending，#36保持开放。151302-s2原75/空bindings及failed/rc0/awaiting_review不追认，#27正式ACK CLI阻塞与科学父保留。#46原24h窗口不重置；功能队列42工具余项→35→50→28→37→20父功能。不运行模型、play、live发布或生产控制。
