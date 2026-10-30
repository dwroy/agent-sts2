# #83 工具 r3：补齐 fixed producer 工程声明

按主管 [6517581064](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6517581064) 返工。原开发基线仍为 `f2d8e742776751620a675fae168c04b4323421f7`；r3 是已交工具 r2 `2a43add7a4ce7e9a00a6b45b4179f6471850b73a` 的窄后继，不引入本树未提交的模型/数据研究。原失败批 `e0f67bc9e6194fa5bdb72ba2cba6b409` 与日志保留，不重跑旧 full；本请求排 #82 单独采用之后。

## 声明修复

只新增交付一个 ROOT 工程声明叶 `ops/fixed-producer-dependencies.json`。该叶取已采用 #84 的 main `816b4f6a94408f54a6371d8858e5846abb94056e` 精确原件，作以下人工审阅的七个节点更新；其余节点、common、producer 合同、验证器和发布门均不改。

- `v6-history`：更新 `combat-entries.ts` 的源码 SHA、全文件 opaque SHA 与静态边；增加 `combat-entry-selection.ts`，明确其唯一静态导入 `v6/schema.ts`（后者原已声明）。新增选择器仍按原知识文件入口读取，不扩大知识范围。
- `silent-boss-calibration`：更新 `eye/run-config.ts`、`jev/combat-entries.ts`、`jev/combat-entry-projection.ts`、`jev/combat-entry-replay.ts` 的源码/opaque SHA 与新增 selection 静态边；增加 selection→schema 节点。原科学 `model_fingerprint` 读取整套 `agent/src`，所以四个既有叶与新增叶均须声明。两个 `agent/tools/v6` CLI 不在其原读取 family/导入闭包内，不凭名称加入。

两组方法输入数分别从305→306、398→399。13个 producer 逐一经原验证器核闭包，只有以上两组方法身份改变，其余11组完全相同。逐节点前后原件、源码映射及所有方法前后 SHA 见 `tools-r3-declaration-review.json`。声明完整文件为560626字节，SHA 见该原件；不把改变声明文件自身误算为所有 producer 方法变化。

## 固定验证

自有 `.artifacts/issue83/tools-r3/checked-combination` 由精确 main `816b4f6a` 的原 #84 代码/测试和原 r2 七源码叶构成；没有借入当前 rollout 研究改动，没有改集成员树。旧声明先复现指定两文件44项中的4个 error，与主管原件一致；新声明同两文件 **44项全绿，32.785秒，exit0**：

```bash
nice -n 19 python3 -m unittest ops.tests.test_fixed_producer_admission ops.tests.test_learning_runtime
```

原红26.065秒与新绿日志/exit均保存在自有 `.artifacts/issue83/tools-r3/`，SHA/字节数记录于 review JSON。原测试保留缺声明、新 opaque site、缺静态边、校准新增实际读叶拒绝，以及发布同事务/CAS/漂移/失败回执拒绝等覆盖，没有削弱断言。

r3相对r2仅工程声明和材料，七源码逐叶与r2相同；ROOT由7→8叶，LIVE仍四叶，测试三叶映射不变。旧 r1/r2 tsc、126项与历史广域红保留，不重述为本次实际组合 full 通过。#82 三源码 `eval/spire_codex{,_download,_projection}.py` 不在任何现有方法闭包，先采用不改变本次方法预览；实际冻结仍由集成员重新核。

## 同批方法准入交接

`tools-r3-{v6-history,silent-boss-calibration}-manifest.json` 是经原验证器产生的受测输入/边/方法 SHA；`tools-r3-method-handoff.json` 固定声明及两清单 SHA、命令、检查和最终票据入口。它们是开发预览材料，不是生产准入票据，也不能直接抄入 control.methods。

集成员冻结新的实际 ROOT/LIVE 组合并完成其唯一完整检查后，按 #84 `docs/fixed-producer-admission.md`，用新终态回执运行 `fixed_method_admission.py --runtime-source <CHECKED_ROOT> --code-source <CHECKED_LIVE> --engineering-receipt <NEW_FINAL_TERMINAL> --output <NEW_METHOD_TICKET>`。原入口必须核六项必需检查及全部细项 passed、full_runs=1、candidate/双根/真实LIVE前像与全部方法输入一致，才能准备票据。生产实际上启用的 producer 清单由原 control 读取，不能仅凭本预览两项替代。

原 publication owner 在同一个带 `--fixed-method-admission` 的 publication_gate write 里部署 ROOT声明、ROOT七源/LIVE四叶，核实际安装方法并CAS准入，保原持久回执；禁止事后手改 control 补绿。若实际视图与预览有差异，先审计/重冻新组合，不改声明门放行。回退也经原事务恢复匹配的源码、声明与methods前像，保留失败批、D1与历史。

开发本次只交固定 r3 请求，不 submit/tick/install，不修改生产开关、live/STOP或其他会话。四 Boss 科学验收、首次尝试/较晚val、条目及真实两臂结果继续分账；不关闭 #83。
