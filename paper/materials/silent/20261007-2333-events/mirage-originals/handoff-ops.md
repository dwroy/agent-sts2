# 静默猎手策略学习回报

源码已提交 `cf0f2495354d9cf5dcb96dc31a2de0f4c53f441a`；两次live合入锁都被占用（第二次等60秒），退出75，未改live。`merged=null`，无本任务上线版本、无合后测试、未标shipped。按合入受阻流程交运维兜底。

基线 `0b4b4c89235f15713316a0b06c81a03a34c08036`。先核开工树干净、合main无冲突；开工旧分支 `fix-batch-20261007-173847` 与合main的 `2c718ee6f5c90ae2bc0ce31d1f53dd3c159c2b89` 保留。发现其含上一批勒紧+ `5e80e683` 后，本项转入从main建立的 `strategy-silent-mirage-20261007-223545`；不随本项发布上一批代码。

## 本项实现与证据

派发 silent-proposal-329a2629d5f1bf1e；补充CLI代码提案 silent-proposal-9c628c8136bd1848（pending）；账本 silent-0010，只经根 ledger.py 追加 proposed、证据链接和源码commit，保留旧claim/首证/经验shipment历史。领域 combat；未改药水/SL/终局/结构。

DUZUBAJ3A8GP，SILENT A10，F30 T5：首试528→532，末试612→616，先施毒使毒4+4→4+9，蜃景现场8→13挡，玩家9→22挡；第三次584→588改施毒另一目标仍13挡；第二次556→557单敌1毒、先蜃景只得1挡。SL不作独立样本，不能推整场转胜。

旧同方案按入口8挡，完整前缀少报5、17挡；新按施放时存活敌当前毒总量给挡，毒不消费，后加毒不追补。仅普通MIRAGE、silent A10、CalculationBase=0/Extra=1、无敏捷/脆弱/不可动摇/幽影修正时生效。其他角色/未知等级/升级/未观察组合保持原行为；保留全部合法选项与目标，未新增固定杀序或权重。

只提交4个源码文件（卡牌模型、战斗/牌堆进阶上下文、求解器）与2个固定测试文件；生成脚本未改，无需重建知识。铁甲数据未读、模型新标记不对铁甲开启；固定比较确认其他角色与不支持范围模型保持等价。

## 验证

- 最终撤源码：final-withdrawn-source-red.rc=1，9例中5失败/4通过，包含实际17对22挡、零毒后施毒与后轮旧13对实际8挡差异。恢复：final-restored-source-green.rc=0，蜃景9+铁蒺藜7=16例；existing-fixed-cases-retry.rc=0，尖啸/铜鳞本局另3例，共19例。
- 首次原入口 source-sandbox.rc=1：tsc0，240文件中的239通过/1失败，2522过/1败；失败仅check-imports把我保存的4份.ts源码备份当源码。备份原字节改名为.ts.txt并保存路径映射；原失败日志不删不覆盖，导入检查单复测1过。
- 原入口完整重跑 source-sandbox-retry.rc=0：tsc0，vitest首段240文件2523例全过、paths段1文件11例全过，共241文件2534例。未增加排除、未调生产预算、未安装依赖、未联网/LLM/运行play。第一次单worker965秒，重跑4worker382秒，保持沙箱原排除名单。
- source gitleaks 0，暂存35.30KB差异无泄露；最终scratch扫描另见gitleaks-artifacts.log/rc。提交前全局身份未改，英文提交、Co-Authored-By: Codex GPT-6.1-sol。
- 工作树的6文件逐SHA256与自测暂存版本一致；根账本CLI check：261项、0问题。所有初稿、测试辅助入口错误、迁移签名错误与旧失败日志均保存。

## 派发逐项处置

10项都核角色、来源、账本、原Markdown及指纹：四个来源局均SILENT A10，重提取2027帧与旧证据清单逐局SHA256一致。原Markdown已保留，未重复写历史复盘。3 duplicate、6证据不足 waiting、1已实现源码但合入受阻 waiting；后者不冒称 implemented。

### silent-proposal-5264153a4a4b0e5c


请按report.md末尾的三方合并、合后检查与实际版本登记步骤兜底；当前不称implemented/shipped。
