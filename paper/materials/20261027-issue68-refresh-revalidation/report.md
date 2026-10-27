# #68 自然刷新冻结永久修复

裁决6431568413；基线4cb7e7de21510b1d76eeb45b8f9ec6fa7471dcce。本交付固定提交见issue评论，分支issue-68-refresh-revalidation，原R2 fcd84d2ae158f8264866e8ea7452990f4053d170及原远端分支/本地issue-68-r2-delivered保留。没有追改3e43、原六绿、生产控制或旧证据；#80当前批由原角色按主管临时授权独立处理。

## 实现与合同

- board_queue_checks保原strict校验，assembly冻结全部candidate_targets及配置的natural_refresh。新board_queue_refresh仅接受已声明、可确定受影响检查、既存普通文件且mode不变、与全部目标不相交的LIVE内容漂移。源码/两视图夹具、ROOT数据、工具/依赖/策略和LIVE HEAD/tree/index entries/flags仍严格；旧assembly没有声明即拒绝，不能手补旧作业字段套新绿。
- 本批refresh-revalidation/<id>先按原容量/no-checkout/显式排除合同创建隔离G，复制原受测代码/其他输入，只覆盖新数据。根据配置运行有界消费者或显式测试文件，不调用full/tick/submit/发布。原W/G与assembly不改，原full次数不改。
- 新board_refresh_readers消费者从隔离G导入原catalog/query、renderer/monster records、适用construction/history API，实际读新文件并核SHA/必要结构；报告仅UTF-8读取。配置13个路径模式覆盖#80已证52项，元数据分类原件issue80-path-coverage.json；这不代表旧批已做补验。未给经验、手写策略或builder程序开例外。
- 每次记录路径前后SHA/模式、候选/基线、选定检查、argv/PID/start/boot/继承FD/退出与日志、strict门gate_result。成功消费者不能掩盖其后源码/依赖漂移；检查期再刷新、未知集合、目标相交、缺/坏文件等均拒绝并留原因。同数据只能在原补验视图/严格输入仍完全不变时复用，新数据另建证据。
- 发布回调的owner须先在业务锁外得到合法机器租约；补验只继承实际资源/queue FD及仍有效的原full FD，不在K/L内等槽。原发布锁域仍负责最后瞬时校验到写体的稳定性/CAS。消费者前台且有超时，不扩后台容量或停止游戏。

## 验证（原失败分账）

- 项目定向80项过，含三要求分支、未知映射、补验失败/再漂移、权限/index/依赖严格拒绝、缓存视图篡改、无sys.modules注册的发布器加载方式。真实MJS用原gkb固定夹具读取新数据并拒绝坏JSON。project-targeted.log。
- 单worker/nice19原脚本自测：生产tsc0，646文件645过1败、5956项5955过1败；失败仅check-imports缺原声明的稀疏issue29 results.jsonl，paths因set-e未跑。sandbox.log及sandbox-terminal.json原样保留；两个原Node PID已退，六个受测输入无漂移。
- 从该基线原blob恢复夹具（211076字节，fixture-restoration.json），不改源码或扩大排除。随后import/board queue/paths共3文件13项全过，post-fixture-vitest.log。没有第二轮全量沙箱，不称原首轮全绿，也不把此开发检查冒最终实际ROOT/LIVE组合。
- proof.py导出五组固定Git/真实前台消费例：不相交补验放行、目标相交拒绝、源码拒绝、夹具拒绝、未声明拒绝；fixed-git-proof/保差异/命令退出/门结果及同版复用回执。full为明确标记的合成旧结果，actual_full_started=false；不是实际项目shadow/发布证据。
- 首定向32项2败属于测试mock拦截Git及修改candidate target导致比预期更早拒绝，已修测试设置/断言，initial-targeted-failures.json保留原因，原工具回合日志不改写；后35及最终80通过分别保日志。

## 交付及接续

LIVE安装叶0。host/ROOT生产叶为ops/board_queue_checks.py、board_queue_refresh.py、board_refresh_readers.mjs和两agents配置；测试/文档/记录ROOT-only。delivery-map.json给全部8叶旧blob/新SHA/mode，材料同目录。固定pin51c289c与第三方元数据不改。新声明/两执行依赖须与新源码一起纳入原policy指纹；安装时只取queue-checks的natural_refresh新字段及merge-queue的两个policy_files追加，保原集成针对届时实际候选冻结的runtime/fixture/host/consumer组合，不整叶覆盖当前#80合同。本交付本身runtime_install_paths为空集，文件中基线既有其他交付的8项映射不是本包部署叶。

按docs/github-issues-workflow.md仅在本树准备固定request，原登记owner接原正常队列，开发不改生产journal、旧批attempt/revision/full.once，不手动tick或自启authority。新策略影响旧作业结果仍按原失效合同，不追套旧六绿。原集成接精确当前ROOT/LIVE组合及必要消费者；原ops接实际发布/运行。新固定请求及commit见issue交付评论，本工程不替原角色签运行验收、不分配游戏发布号。
