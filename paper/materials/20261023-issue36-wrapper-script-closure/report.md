# #36：移除未发布的 seal 调用并检查脚本发布完整性

按主管本轮指示，采用“去掉调用”方案。实际live b49984b7的wrapper blob为c63aca475；该wrapper确实无条件调用ops/learner_tabs.py，但发布树和实际目录均无该文件。旧固定夹具提供了此模块stub，掩盖了发布缺文件的漏检。该模块位于尚未采用的#20分支并依赖其配置/保护合同，本次不拆入不完整回收功能。

运行只改wrapper一个收尾块：原finished成功、完整wrapper v1回执已原子持久化后，直接完成交接；删除未发布模块的调用及由此产生的seal attention/75。原finish失败、绑定/summary/日志/输出/PID/身份门、300秒降级、真实failed/rc0、空修复验收和retention保留门不变。wrapper不关tab，也不冒造#20 tab-retirement封印；#20整体采用后再按其合同接入，不把缺模块当原生或语义审计失败。

新增learner-wrapper-scripts.test.ts：提取wrapper通过ROOT/OPS直接引用的仓库脚本及paths.sh，检查Git发布文件集合与实际文件存在；涵盖两条任务路线的12个脚本。旧learner_tabs.py调用在无模块组合中明确失败，逐个移除任意必需脚本也失败，防止临时stub再次掩盖部署遗漏。只检查仓库脚本字面引用；Node/tsx等安装依赖继续由原allocator门负责。wrapper固定测试覆盖模块不存在、存在但报错均不调用、不阻塞真实完成，以及failed/rejected/code0原样记录；原生/语义验收测试未放宽。

在实际已发布wrapper上仅施加同一差量，旧缺文件反例复现、修后缺依赖为空；原stdio实时日志9行块逐字节/SHA不变，bash语法0，组合wrapper的17项固定测试通过，见combination.json。开发分支wrapper尚不含该日志块，集成员须应用本枚差量，不能整文件覆盖现有wrapper；组合目标SHA已记录以便复核。

nice19、单线程/串行：tsc0，定向3文件23项全过（内含Python43，不重复加算），原空fix20项原样通过；另有上述组合17项。日志本地同目录保留，输入/日志SHA见checks.json。本轮无full、发布或在途会话动作，不修改main/live/STOP/hosting，不回写134302/131316旧批或补造死主管封印，不重派任务、不关tab。实际后续自然收尾和#20回收/科学父仍分别验收。
