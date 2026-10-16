---
title: 原量化owner G3b前瞻预测后继帧有界核实
tools: Read, Grep, Glob, Bash, Edit, Write
effort.codex: xhigh
timeout_min: 240
max_turns: 800
---
# 同一原量化线程接续；只交固定离线真实后继帧核验

你仍是原 roy-20261011-silent-core-cycle-quantitative-learning / 024317 owner，原线程01a12c46。本次属于已授权原父roy-20261016-global-build的G3b，既有G4原线程只作来源，不另派同题owner，不重复旧研究/模拟。原51e0工作树、旧报告及failed/rc0历史保持，不合旧分支到main/live。当前模型统一gpt-6.1-sol/xhigh/default、原codex1 learner home与沙箱不扩权。自己完成，不另派辅助/子agent。

先读本仓库AGENTS/README/最新STATE/decision-log/learning-protocol及主根docs/v5-construction.md。以下独立新补充优先于旧轮要求；不因旧任务描述重启实现、实验或经验发布。原宽父、G4资格及0332保持。

冻结补充：{
  "at": "2026-10-16 13:55:39 CST",
  "supplement_id": "global-build-g3b-20261016-successor-frames",
  "revision": 1,
  "phase": "G3b-prospective-successor-frames",
  "parent_request_id": "roy-20261016-global-build",
  "original_learning_request": "roy-20261011-silent-core-cycle-quantitative-learning",
  "linked_request": "roy-20261012-concrete-core-decklists",
  "parent_batch": "20261012-024317-strategy-proposal",
  "same_thread": "01a12c46-fef2-7282-b689-1fd8b4e0450b",
  "worktree": ".worktrees/codex-strategy-silent-20261012-024317",
  "original_owner_role": "quantitative",
  "original_owner_log": {
    "path": ".worktrees/codex-strategy-silent-20261012-024317/learner/runs/20261012-024330-strategy-proposal.jsonl",
    "bytes": 1436253,
    "sha256": "05f714b76491fa0faf2872b2a2011b1efe8d8c4c8e8e66244949b31d7ff25687"
  },
  "input": {
    "path": "paper/materials/20261016-global-build-g3b/learner-input.md",
    "bytes": 7716,
    "sha256": "aff9f3238929dd5ef41accfaafc6ebc778b209bbeeb05d63493938f53be49e9f"
  },
  "manifest": {
    "path": "paper/materials/20261016-global-build-g3b/inputs/manifest.json",
    "bytes": 229946,
    "sha256": "588276ef299dd6802bfe3e7e69e5ad07a506a91eb81bd034bdf30b10824d6ecb"
  },
  "artifacts": [
    {
      "path": "paper/materials/20261016-global-build-g3b/inputs/runs.json",
      "bytes": 35596,
      "sha256": "be2a1093678b8536b730358771506d66abdf4f2393dd0b8ec16efad1d6c7bd76"
    },
    {
      "path": "paper/materials/20261016-global-build-g3b/inputs/run-plans.json",
      "bytes": 3,
      "sha256": "37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570"
    },
    {
      "path": "paper/materials/20261016-global-build-g3b/inputs/prediction-groups.json",
      "bytes": 64011,
      "sha256": "1b3740ea53b361d085b99bffc3bd0b02e312541c403d5396f2fef19213c1cec9"
    },
    {
      "path": "paper/materials/20261016-global-build-g3b/inputs/run-config.json",
      "bytes": 300097,
      "sha256": "fc0e44bdf040526f4e9e286b41a00011a1f37f83b1c7e761fa8a01dedb217760"
    },
    {
      "path": "paper/materials/20261016-global-build-g3b/inputs/sl-attempts.json",
      "bytes": 7251897,
      "sha256": "b7f023fbc202dcc20f3360b8aa1278d01fc433618b4dcd90b68a33878d89bac9"
    },
    {
      "path": "paper/materials/20261016-global-build-g3b/inputs/construction-records.jsonl.gz",
      "bytes": 13643158,
      "sha256": "8288a7928178ba0c1da088a2e5c385c132959fe7075e98e59737437e467a97e6"
    },
    {
      "path": "paper/materials/20261016-global-build-g3b/inputs/predictions.jsonl.gz",
      "bytes": 1181594,
      "sha256": "1aecb2ea33bcec848cf094543876745eaa7ac2c10df4a182f44bd1037841010c"
    }
  ],
  "authorization": [
    {
      "path": "paper/materials/20261016-global-build-g3b/assignment.txt",
      "bytes": 1457,
      "sha256": "a8b4aca37262b395dae057ce150f57c9b7670d9f0379d012517fad518bdb97d6"
    },
    {
      "path": "paper/materials/20261016-global-build-g3b/assignment.native.jsonl",
      "bytes": 2156,
      "sha256": "dc571524b7c16b36aa10e7380e950f86eb167c4d8c26049e83d72138d4dbd690"
    }
  ],
  "requirements": [
    "initial-option",
    "actual-route",
    "completion-choice-policy",
    "sl-branch",
    "original-template-endpoint",
    "separate-observations",
    "all-anchor-coverage"
  ],
  "no_new_learning_parent": true,
  "old_revisions_and_wide_parents_unchanged": true,
  "only_fixed_offline_evidence": true,
  "no_simulation_game_API_or_extra_model_calls": true,
  "output_directory": "learner-results",
  "owner_only_one_pass_then_stop": true
}

实际input文件SHA=090156079b1e5da5efe292c5be3249cd4a517bd933be9865b1b39983422248de。逐项核冻结引用，使用主根绝对路径读取input-r1/learner-input及manifest。原始日志仅可使用各source_bounds的complete_prefix_bytes以内字节，不借当前追加帧补截止。不得重新运行任何预测、历史模拟、模型实验/API、游戏API/play、源码full或安装依赖；只允许本次原线程本身的必要学习推理，不能另开模型会话。离线命令nice19，每项至多4进程，无自然监听/轮询等候。

用户追加的coordination/anchor-index.json（SHA724e2996f7634079901a6ff25838f4a15b5e8a2b85a012714ae500015a40791d）仅为同1371锚点的可选轻量索引，不改变冻结input/manifest或要求。可用它按窗口去重读取；它的chosen元数据不是实际动作/政策/结局真值，必须核原帧。input-audit/template-binding-check可复用已核结果；早期缺绑定不得倒填。

只在本WT的{{scratch}}/learner-results写本轮report.md、outcomes.jsonl、coverage.json、确定性提取脚本和逐原帧manifest；不得改主根/线上源码、经验、construction-calibration.json、配置、注册或通知ACK，不自动提交/合live。原树旧代码不代表R328以来计算语义：按预测原source SHA经git show只读历史completionChoice/route/template，不能用当前模板替换。缺真实路径/模型/政策/模板/as_of或证据就明确排除，不能修补输入造标签。

必须本人完整读取被冻结learner-input.md并逐项执行。覆盖1371锚点，按窗口共享证据；145264展开行不是独立样本，无需逐行重复研究。初始实际选项、真实路线、completion-choice-v1后继合法选择、SL分支与原模板签名终点均附原帧offset/len/SHA；current不能当实际skip，attempt的null不能补1；未选候选不得占同identity，政策/路线改变、截点前未到期/死亡、未知事件、分支不闭合如实排除。拥有组件/实际施放/存活/整局结果分列，functional仍unknown。没有合格组只交实际缺口，不凑10局或创建通过文件。report/outcomes/coverage以learner-input合同为准；watcher后续运行原eval/construction.py，不由你推进advisory、G3a/G3c/G5或G2自然门槛。

已有run-plans.json为空是原投影事实，不可补造；可按manifest以内原完整决策中已保存计划核，仍缺证就列缺口。与旧知识冲突须原文/证据/旧知识ID/不同结论和下一步，交ops→原watcher→Roy，不代ACK。

完成此限定报告即停；若核验范围未完成须如实列未完锚点及新增产物，不称全否定。最后strategy-proposal JSON保原格式：task/character/base/runs/fixes=[]/merged=null/tests={tsc:null,vitest:null,cases:null}/code_proposals=[]/implementation_domains=[]/proposal_results=[]/report真实路径；parent_complete=false，附continuation_result{supplement_id,parent_batch,phase:G3b-prospective-successor-frames,input_manifest_sha256:090156079b1e5da5efe292c5be3249cd4a517bd933be9865b1b39983422248de,outcome:complete|continue|blocked,coverage,inputs/results原件refs,checkpoint,next_step}。complete只表示本轮真实证据报告交付，不关闭原学习/量化宽父，不等校准通过或任何角色已接受；不要伪造commit/test/用户确认以绕通用报告守卫。
