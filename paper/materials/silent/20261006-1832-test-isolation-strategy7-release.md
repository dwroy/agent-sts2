# 测试输入隔离修复及独立策略7上线

2026-10-06 18:35，处理18:32 fix-done 20261006-175455-fix-batch。学习者exit0，实际固定发布fc17d02d464c803162f551f08dba97a09d91f7c7/树63bbe08bbad921c549443c51fff4bd42fb93a86e为live祖先。

- 纯测试修复：源38e95b24efafb862fc09b1fd026626acf481c47d→实际代码ae8008c9bc6a43c846de9d50df523f6b707371e9→独立发布59c9a75a35645fd79383fcfef4870c784b508540；只固定既有历史测试输入，未改生产时钟、原断言阈值、校准或知识生成器，不加行为版本。源及合后tsc0/vitest0、203文件2195例。
- 既有蜡烛事实提案：原源9a865dbe87b4e64a5d50c59b389d99ed73bebb52→实际代码633f33127d3c12473e998d71aca88d7af04cb89d→固定发布fc17d02d464c803162f551f08dba97a09d91f7c7，唯一S1.strategy7。源组合及合后tsc0/vitest0、204文件2203例，源码三个blob同原已提交提案。证据及提案原文沿既有UJ0K3G10609Y、XBD8Z9XLPCPN记录，运维不补写或审核游戏规则；0186尚为proposed，随后按实际合入CLI登记。
- 固定3599ab0a输入撤修复两例失败、恢复34例通过，初稿装载器/缺common错误日志、原exp45/策略/exp46完整失败及回退历史全部保留；不把这次自测覆盖旧失败，完整外部检查待本批learner-checks。没有新增bug-infra，不新建账本或重置旧条目。
- 两次知识incoming为空，df08e479已提交刷新与固定发布knowledge blob相同。机械同步main时只携带已提交刷新及已测代码，保留主目录最新记录、后台台账和notes，live不再合入。运行中的20261006-181302-experience-update源分支已包含620513af；第46批沿该批处理，当前不重复派发/不登记exp46或其shipped。
- /home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 189 item(s), 0 problem(s)。永冻0172、证据不足/性能及原策略专项保持开放；原回报列出的旧Roy事项不另造新待定。

## 原始产出指纹

```json
[
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/report.json",
    "source": "learner/runs/20261006-175455-fix-batch/report.json",
    "bytes": 1566,
    "sha256": "1fa9c07cf874bf6920b8bac8fc0dcf97e18951b546c297fa336749bfb661ba83"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/report.md",
    "source": "learner/runs/20261006-175455-fix-batch/report.md",
    "bytes": 3192,
    "sha256": "3aabc6d640e36773fc3e9d2bc711d3836c5e83a7e1213a31cff5846fd995e004"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/handoff-ops.md",
    "source": "learner/runs/20261006-175455-fix-batch/handoff-ops.md",
    "bytes": 2642,
    "sha256": "7e990bf133f50c419c45ac8a28b0d81c047f508ff82b222e93e83babace5e593"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/verification.json",
    "source": "learner/runs/20261006-175455-fix-batch/verification.json",
    "bytes": 905,
    "sha256": "3893ed9693b58cbbf7feca30f3f682153a16104af42358f9036e4f180023b6df"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/fix-integration-evidence.json",
    "source": "learner/runs/20261006-175455-fix-batch/fix-integration-evidence.json",
    "bytes": 314,
    "sha256": "89212eed48ea818ee92690be4d43799fdc04c697a161d99bea71578ef1c0ae00"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/already-fixed.md",
    "source": "learner/runs/20261006-175455-fix-batch/already-fixed.md",
    "bytes": 11383,
    "sha256": "0ae0489390cbbc936d6ce01d8075af24336da62ba49fb04cb96ec40e8e5a8328"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/fix-only-source-suite.txt",
    "source": "learner/runs/20261006-175455-fix-batch/fix-only-source-suite.log",
    "bytes": 502,
    "sha256": "1c49fc31efce3f7f83c90b99fb647ec3a39e2c163a3533c90be25eea479c3485"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/fix-live-suite.txt",
    "source": "learner/runs/20261006-175455-fix-batch/fix-live-suite.log",
    "bytes": 493,
    "sha256": "82fde56e9c25f20642c4ef4de7bb2f5405b56825d2e2e6867f5e4372c7106eb8"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/source-suite.txt",
    "source": "learner/runs/20261006-175455-fix-batch/source-suite.log",
    "bytes": 502,
    "sha256": "b62e0c7d3ab00e07af6a674cabe501c85eb41e6e4245a34c5a09616ec8da6afd"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/strategy-live-suite.txt",
    "source": "learner/runs/20261006-175455-fix-batch/strategy-live-suite.log",
    "bytes": 492,
    "sha256": "c20b28bf77aa714b39d4a98768722481af0c01644a81a9a7459db9ae77c72641"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/boss-baseline.txt",
    "source": "learner/runs/20261006-175455-fix-batch/boss-baseline.log",
    "bytes": 244,
    "sha256": "74a94e3a1cd9c18e921c1a6a954f93cdad6993675f7a56e409011034c8f35fa1"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/boss-fixed.txt",
    "source": "learner/runs/20261006-175455-fix-batch/boss-fixed.log",
    "bytes": 5566,
    "sha256": "5bd44cbbeeee347002a43b60b2bc1fb93a55dc5e1db8af9d02c6feadcbcb2254"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/boss-fixed-v2.txt",
    "source": "learner/runs/20261006-175455-fix-batch/boss-fixed-v2.log",
    "bytes": 2779,
    "sha256": "67e3b718cb9f57ef4ff4d484f02e2a0006ee0e5a62a051e2fcfc023631797be8"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/boss-fixed-v3.txt",
    "source": "learner/runs/20261006-175455-fix-batch/boss-fixed-v3.log",
    "bytes": 244,
    "sha256": "ca2f547f7609703036418fde22a3cea3aa41ffe64db818601d38a6734ad9c3e2"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/boss-withdrawn.txt",
    "source": "learner/runs/20261006-175455-fix-batch/boss-withdrawn.log",
    "bytes": 1149,
    "sha256": "228b0586018cae73a62f2d9e514cb3f014158c7c060fbf56867c0ca6636a3412"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/boss-withdrawn-v2.txt",
    "source": "learner/runs/20261006-175455-fix-batch/boss-withdrawn-v2.log",
    "bytes": 1453729,
    "sha256": "707015475f55f4fec20ab7c8f31ce77c74eff452cc72285a08c4a1a2f5bda784"
  },
  {
    "path": "paper/materials/silent/20261006-1832-test-isolation-strategy7-release/boss-restored.txt",
    "source": "learner/runs/20261006-175455-fix-batch/boss-restored.log",
    "bytes": 244,
    "sha256": "9b10c9467c65a74c455ab5048610b337213147506c91bc6fd285832ac01549c2"
  }
]
```
