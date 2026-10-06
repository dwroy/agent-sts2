# 策略批次 20261006-172732-strategy-proposal：基线检查阻塞，未上线

记录时间：2026-10-06 17:54 CST。学习者回报 exit 0 表示任务正常返回；最终 tests.vitest=1、merged=null，不能当作上线成功。

源码 9a865dbe87b4e64a5d50c59b389d99ed73bebb52 已提交在干净分支 strategy-proposal-20261006-172733，当前 codex-dev 工作树在该分支。实现为学习者的休息题条件参考提案，silent-0186，来源 UJ0K3G10609Y SILENT A10 F29、XBD8Z9XLPCPN SILENT A10 F24/28/32及原回报所列T2；关联0184/0185/0020。运维只归档原文，不另审策略或补知识。原proposal/报告/交接及关键测试日志逐字节复制到 paper/materials/silent/20261006-1751-strategy-blocked/。

## 检查与回退

- 源固定沙箱入口 exit0、tsc0，203文件2191例加paths1文件11例，共204文件2202例；源无负载重跑。撤生产接线7失败1通过、恢复8通过，初稿缺session夹具8失败的原历史亦保持。
- 锁内将七项知识刷新提交3599ab0ae3be80d13b77f57f5af8b785cb09c437，incoming知识为空、重叠为空、预检0，尝试合入6b2a582dda7c8d745e092280724c0b94e5aca2af。
- 合后tsc0，主vitest202文件2190通过、1文件1失败（总203文件2191例），17:41:41/276.03秒；因入口set -e，paths未跑。唯一boss-clock.test.ts:191 ERPH旧夹具 >=9实8，与17:39完整失败一致。
- 学习者已reset --merge回退到3599ab0a，rollback_exit0，保留七份刷新及原两个notes差异；没有新增eval版本或shipped。当前live仍3599ab0a，源码不是live祖先。已撤回6b2a582d不是实际发布。
- 相同刷新基线17:48:44/608ms定向重现同一失败：1失败32未选择，exit1。失败合入与回退之间时钟源码、对应测试、全部knowledge diff为空；baseline-check流程exit0仅代表核对完成，不是测试通过。原 diff 的SHA256是空文件指纹，不删原失败。

## 处置

本轮暂不兜底合入main/live，不新增版本、不改变0186的proposed。保留已提交源分支、既有S1.exp45及全部刷新，先派学习者处理17:39同一基线检查阻塞。修复不能改9为8、放宽断言、增加排除或改游戏校准来过测；根因仍待学习者定位。测试修复与未上线策略分开登记，不能将0186随fix-batch默合后漏记版本；修复完成、源/合后检查通过后再按live流程实际合入策略并登记版本/0186 shipped。

仅将0186原三行学习者载荷补入本次提交，未代提交其他后台账本行、未补写学习内容；/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 186 item(s), 0 problem(s)。没有新的Roy待定事项；派发结果随后追加，对局继续。

## 原文指纹

```json
{
  "proposal.md": {
    "bytes": 10320,
    "sha256": "4665ef09b495034e96d739e2a29223f86c525e66bb6556f25a7918bd3bf3532b"
  },
  "handoff-ops.md": {
    "bytes": 2850,
    "sha256": "924341ea706792001e0830f81553fea85d29735133c04b8ce02fa8a53dbdc029"
  },
  "report.json": {
    "bytes": 1898,
    "sha256": "686b17d96e88363011a3f214d2fa01d8c00aba2342adc10d4311f78ac2defb34"
  },
  "live-result.json": {
    "bytes": 1381,
    "sha256": "01060112989d86aa87d22d3932353eb48c40ab0bfd99422948ab70e9df49fb8c"
  },
  "final-verification.json": {
    "bytes": 278,
    "sha256": "92ba81e37134d7064b6b85c18ac8cb800fcb2372c4f4736e67d9913693f0bf51"
  },
  "source-suite.log": {
    "bytes": 502,
    "sha256": "1d1127d98195abaa79038d3ef31e2cf724a9b344cd3c933dc36759a48688b028"
  },
  "source-withdrawn.log": {
    "bytes": 5182,
    "sha256": "9a7476b932c6965089e848ce854f8c3c69c12678d2cb9878147ecfc4baa59b62"
  },
  "source-restored.log": {
    "bytes": 241,
    "sha256": "1a0ca9a9a7ca7fd7d54100193363d856a52b60c8b8bed78193b60b0249faafda"
  },
  "live-suite.log": {
    "bytes": 1178,
    "sha256": "647c5a8aa04a85468b1c784fe2c370a9af9110b9fac148151caf2da123badf57"
  },
  "baseline-targeted.log": {
    "bytes": 1163,
    "sha256": "ce2359eba9b00b11428068b7cc2b8fe6268641a131c21c9e09ad55adbdc56a0b"
  },
  "baseline-source-data.diff": {
    "bytes": 0,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
}
```
