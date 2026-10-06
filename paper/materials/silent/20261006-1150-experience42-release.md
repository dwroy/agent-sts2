# 静默经验第42批上线记录

- 2026-10-06 11:51 处理11:50 experience-done 20261006-112702-experience-update（学习者目录112703）：源d673c6a7e270ef770f19d9ced3d3edef79f24e31→实际live合入8224bcc9ef8f825bbdca7ca6ec3b03535cf81725→固定发布b449544f0116b3f32cdf14582c61df0a7940e8bb/树5b17216458edb6ec5e6d60c4831befd141faf8e5/唯一S1.exp42；源经验blob同发布，学习者自测自行合入，运维只核实、同步与登记。
- 经验2026-10-06.16→.17，新增1更新8（全补证/纯数字0）退役0，active115→116、50181→50905字；来源PJ2LL9KU7FHD SILENT A10及旧本角色证据。原第42節20452字节/SHA256 d6145059f5edfc04a8434d8a745efeb1234cddae176e7c3330ebdf89c300b80b与十项十行proposed/SHA256 bd43238747f1b17db8c9575e672ce1b331448f81f71c629df917c4935fa84a48逐字归档。
- 源首轮tsc0/196文件2124例、合后首轮tsc0/199文件2172例；七份重叠知识blob完全相同、其他知识和双方有序日志保持。固定已测发布包含此前学习者代码基线，本轮同步同blob，不另写代码或登记其他修复项。完整外部checks_pending=True留本批后续learner-checks。
- 0173的最早证据由学习者追加更正25226ZFLNR1J/A10→10GPK5XGHCK3/A3，prior=yes及原add历史保持；原十项payload保持，其他首次证据/先验/旧版本/repeat不重置。0172纯bug与0166原repeat不在本批登记；后台其他任务行不代提交。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 173 item(s), 0 problem(s)。同步main后经CLI/by=ops仅这十项shipped。

## 原始产出指纹

```json
{
  "handoff-ops.md": {
    "bytes": 2067,
    "sha256": "b4049cc213b2c34960f1b093e04ffce1f6e20a60e868aa39ae03dcd58cbb294a"
  },
  "report.json": {
    "bytes": 841,
    "sha256": "21e1ef60d319cc3d4b2ef5ead70255163b2500036700888361943cce4c990ba3"
  },
  "live-merge.json": {
    "bytes": 5641,
    "sha256": "339126e9f8eb66c2e3bd7b6199fb71a3a1eccbc02bd9a0b6d750320be83d9406"
  },
  "test-source-result.json": {
    "bytes": 63,
    "sha256": "e04393829cbb540298197e3cd10a52a6f345d9eeb94d3394250aecda9a33da15"
  },
  "test-source.log": {
    "bytes": 492,
    "sha256": "f38205a2a24dce9d6b079823567704dc8fb9ed84f38d48ec42d42a66e1a6a7b7"
  },
  "test-live.log": {
    "bytes": 495,
    "sha256": "6542b83cf53e449c53cb885d77a1589bde9ce06b6f1aeef6e0c9e15da6670b4e"
  }
}
```

- 2026-10-06 11:52 运维codex完成11:50 experience-done 20261006-112702-experience-update登记：源d673c6a7e270ef770f19d9ced3d3edef79f24e31→实际live 8224bcc9ef8f825bbdca7ca6ec3b03535cf81725→固定发布b449544f0116b3f32cdf14582c61df0a7940e8bb/树5b17216458edb6ec5e6d60c4831befd141faf8e5/唯一S1.exp42，原第42节与十项proposed归档650a7a645278e7e2ee7d72f79ef804481631d981、main机械同步aea59901ae3cd7a79685e0e2dfe1679c865ab0e0。源及合后首轮tsc0/196文件2124例及199文件2172例；全部1027项已测源码/测试blob同发布，其他2158项main最新blob和双方有序日志保持。CLI/by=ops仅十项shipped，0173最早证据沿学习者追加更正25226/A10→10G/A3、prior=yes及原add历史保留，first_run/prior/claim/evidence/repeat保持；0172纯bug、0166原repeat和其他修复状态独立，后台其他任务原行未代提交。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 173 item(s), 0 problem(s)；不新增live合并或源码/知识规则，live实时刷新保持，完整外部等本批learner-checks。详情paper/materials/silent/20261006-1150-experience42-release.md。

- 2026-10-06 14:41 14:35 learner-checks结案：第42批20261006-112702-experience-update完整外部检查对应后续固定发布4fb81b17d099018d348942677bfe31dca333a4b1/树6d6ad56ba9a8c7bf86808cbee502df8e06ad74b3，tsc/vitest0、251文件2986通过2跳过，原日志ops/codex-ops/learner/20261006-112702-experience-update.fallback-6d6ad56ba9a8c7bf86808cbee502df8e06ad74b3.checks.log，61155字节/SHA256 c0290fcce420acffcacb856992ae58b7cbacf988a23367eccf34d4b39f571ca1；checks_pending=false，原十项shipped与首次证据/先验/旧历史保持。不重复合并或重测，后续隔离目录源码独立；详情paper/materials/silent/20261006-1435-fixes-checks-and-engine-precheck.md。
