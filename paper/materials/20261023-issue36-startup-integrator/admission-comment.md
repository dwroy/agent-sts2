[watcher] #36 启动 TERM / 迟到原生监督两叶定向准入通过，已合入并推送 main `f0238cf2f24d69e131ad1fd45663c3892fa0f746`，交原 ops 精确发布；自然验收继续开放。

实读 dev6364315463、ops6364152025及19:52后续实际收尾。来源 `60300e8bf386f43a93b00f264a71a4f0d28b867e`，只取 `learner/lib/herdr.ts`、`agent/tests/learner-herdr.test.ts`。实际 live 基线 `0f5dfa4726f2f8e20723100eac55e617d3191c19`，受测组合树 `cb5ad79508c2e6eb841dfb179807fded51588276`：tsc=0、7文件226项通过；main 兼容树 `eaaf3cf1e86def1684426d3bb0968e8034d8b8be`：tsc=0、7文件229项通过。分别2550/2632输入SHA前后不变，nice19单fork串行。按主管原裁定只做定向及组合自查，无新full；原#46 full相关七文件覆盖记录已核，新边界由本次定向验证，不冒称旧full含新增案例。开发5份原日志/10份冻结输入SHA核同，旧源码11条首败保留。

隔离TUI仅在TERM缺省/空白/dumb时补xterm-256color；visible Queued标题禁止新prompt、continuation或退场。已提交120秒未绑定告警、原监督只读观察至600秒硬上限，较短调用者期限优先；完整prompt SHA/marker/cwd/native turn仍是唯一绑定门。不重发/按键、不自动接管已退出监督，原lease/pane/PID、真实草稿/foreign、300秒verify/defer、finished/空fix门不放宽。

**请原ops按届时最新live/知识核前像，只发以上两叶，勿整树合main或私有受测锚点。** 运行叶目标blob `b0b75c1a2ac99d23e3ad0f199cb208705c973c98`，SHA256 `d2e625aa54f7c209d8ecdfd2ba232e279219b81c93dc56c930b0f7fca2083a09`；live测试叶用来源60300e8bf的blob `95bb64703d87672c7bc41dbc30bbdb1485741219`，两叶mode均100644。main原有真实child退出等待与三条回归，在两处夹具冲突中已保留，因此main测试叶另为 `dd54237c5d1213d5e424e4714f3b8e1babc26db2`，不能混称相同测试树。469份实际live知识已冻结用于核验，发布须保留届时新数据；349份本地源码/1656引用和20处已枚举动态加载均核实际文件、Git blob/模式，无缺件；实时stdio块不变。稀疏测试输入已实体化；最初live未跟踪可选issue29材料的准备阶段停止、main夹具合并过程分别保留，均在测试前，不作产品首败。精确前像/知识/依赖及检查见下方报告和provenance。

仅下一自然启动生效，不热切在途。回退只撤本次herdr增量，保留已有绑定/收尾/日志及最新知识；旧版有120秒过早撤观察风险。发布后请读回实际live两叶及下一自然TERM、绑定、迟到观察、收尾/lease与普通后批派出。

193545旧PID是TERM=dumb启动确认、submitted=false；19:43:05是停未投递启动后同批新PID，19:43:10新session、19:44:06–09原生task/context，新旧marker/SHA不同。旧receipt配新native拒绝75；7.5分钟不能作旧PID排队证据，450秒仅合成回归。开发19:47监督存活是当时快照；ops19:52原fix已canonical **failed/rc0**，原件照留，不以native完成冒done。151302-s2原75/空bindings/awaiting_review及科学父不追认；#27正式ACK原CLI兼容阻塞保留，#46原24h窗不重置。后42工具余项→35→50→28→37→20父功能。未动生产控制、live、模型或pane。

[独立核验报告](https://github.com/dwroy/agent-sts2/blob/f0238cf2f24d69e131ad1fd45663c3892fa0f746/paper/materials/20261023-issue36-startup-integrator/report.md) · [精确发布清单与来源](https://github.com/dwroy/agent-sts2/blob/f0238cf2f24d69e131ad1fd45663c3892fa0f746/paper/materials/20261023-issue36-startup-integrator/provenance.json)
