# 给主 ops 的串行草稿；未执行

先在现有 ops 事务流程核宿主写者和最新 learn，不调用沙箱 status。预检命令可经 `bash ops/codex-ops-do.sh procs` 获取宿主证据；对 main/live 新HEAD重新核本批 source、经验父blob、四核心对象、版本下一槽。任何新经验写入或 lease 改变都要停止使用这个旧切点材料并重新比较，不能清活树。

在主 ops 自有隔离集成树与现有 live-merge 锁流程中，用当前 live 为第一父提交，原 e77 为第二父提交。已核源侧没有待验代码；故本范围只移植经验原文件，其他 live 文件由第一父完整保持。以下是 Git 形状示例，变量必须来自最新锁内读入值，不能直接把固定旧 live 强推到新 live：

```bash
git merge --no-commit --no-ff -s ours e77eb7083e3c1cc1b08b21709ae600cfd447a715
git show e77eb7083e3c1cc1b08b21709ae600cfd447a715:knowledge/characters/silent/experience.json > knowledge/characters/silent/experience.json
git add -- knowledge/characters/silent/experience.json
```

提交前由主 ops 按实际新树运行必要检查与 gitleaks；如果当前代码新变了，原2662例不能替新组合测试。提交说明必须明确“只原 .6 经验；其余 live 树保持”，附本机既有身份/Co-Authored-By。提交后验证两个父为实际 live 切点与原 source；再做：

```bash
git merge-base --is-ancestor e77eb7083e3c1cc1b08b21709ae600cfd447a715 HEAD
git diff --name-only <LOCKED_LIVE_BASE> HEAD
git rev-parse HEAD:knowledge/characters/silent/experience.json
git rev-parse e77eb7083e3c1cc1b08b21709ae600cfd447a715:knowledge/characters/silent/experience.json
```

第一命令必须0；第二必须仅 experience.json；后两 Git blob 必须全等。保存原件/失败、基线/合并/tree/两个父、scope/旧新SHA、四核心完整对象等价、当前 live 其它路径逐blob全等的独立回执。若某流程只做 cherry-pick，不要冒称 e77 祖先，也不要把原 recheck 判定人工绕过。

原本批报告SHA在 source-manifest.json；真实范围就是14条原经验（每条原 field/scope见exact-entry-deltas.json）及映射的16个原账本，不包括新策略实现。主 ops 实际上线后先 date，追加唯一 S1.exp148（须重核仍空）及双收件箱 `notes/for-roy.md`、`ops/inbox-dev.md`；更新原条目只用既有 CLI。`ledger-operations-DRAFT-NOT-EXECUTED.jsonl` 是16行精确模板，包含 `<ACTUAL_LIVE_MERGE_COMMIT>` 占位，**未经替换和真实版本登记不可执行**。填入实际commit而不改旧claim/evidence/where历史后，正常入口为：

```bash
python3 -B learner/ledger.py update < <ACTUAL_VERIFIED_LEDGER_INPUTS_JSONL>
python3 -B learner/ledger.py check
bash ops/codex-ops-do.sh learner-recheck 20261010-091302-experience-update
```

原批历史 failed/rc0/merged=null 和第一次 ENOENT 保持，续验通过以新独立回执补验收，不倒填当时成功。四原代码提案保持原链 pending/已处理身份，由原 learner 依据实际游戏证据续办；经验文字发布不能把提案 claim 广泛标成 implemented。宿主完整检查的固定 tree 与结果沿标准 learner-checks 落盘，发起或客户端timeout都不等验收完成。普通自然对局采用待证，不再重派全历史核心学习或重复已 .5 四核心登记/通知。
