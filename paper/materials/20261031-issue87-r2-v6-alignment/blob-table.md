# 12 恢复 + 3 撤出的前后 blob

前像 main `159cfa750cd94dbafbf84d26b1e2f79afdd0a2cb`；目标 LIVE `3a3eba6a6eb35abc82d06c325dec340b23cc0d70`。本树 candidate 字节逐项匹配目标；物理 LIVE 鲜核同字节/同缺失。仅候选核验，不是部署回执。完整 SHA256 见 [alignment-byte-check.json](alignment-byte-check.json)。

| agent/src/ 路径 | main 前像 blob | 候选 / LIVE 目标 blob |
| --- | --- | --- |
| `hand/screens/v6-room.ts` | `d43af13d5f70b5f56b5bf809f1a7191ac66b7449` | `4c3675475c3c0e6d8418a367ae50359463014002` |
| `sim/continuous-boss-result.ts` | `5c9e414740f4b6f2da55cac253fe05fcb49cdfc1` | `74eadc554a45e36b77e9ef8db93d08023d4260da` |
| `sim/v6-completion.ts` | `0955886dbcd9922362ef22bf9c0dc58ff0e01b6e` | `ae6cef56a8531525fbcbe06ac6f8e392204bdefe` |
| `sim/v6-formation-table.ts` | `fec0f94681b89134d4a06141a7d54cd18054cbd3` | 撤出（LIVE 也不存在） |
| `sim/v6-precompute.ts` | `e56a719efb6a6c06b5418a9cd15307c1b848dc52` | `eaecc43479ab5b2febe82494f7a95c98166223d9` |
| `sim/v6-projection-entries.ts` | `98c1839fa77c7f7a0f430578e652dafedb782c09` | `ca5c44dcdeac91d445123f8bbf764211edc25f16` |
| `sim/v6-projection.ts` | `a372eaf507c6ef840d94783d3cd4668fc0fcc6ae` | `fdf32f734ae14f3d5fe8a2fcfc4b5c1f456d4193` |
| `sim/v6-request-factory.ts` | `9d8c1b7e0ad3c41c03660771bf568a97a56ef9e8` | `1ec43919c66c49c679c8bad51d2f813605e72049` |
| `sim/v6-supply.ts` | `79fd7af5e4b13401eb99365c4ae5c209bab4572f` | `3fb338ccdaa3cccb1b8f2976b72c72c23e6cec98` |
| `sim/v6-table-copy.ts` | `3fcb8884604c7d027fcc4134e6ffb640237e9a7b` | 撤出（LIVE 也不存在） |
| `sim/v6-targets.ts` | `02ab8812d6b46406350fe03e2dc4669464421b5e` | `7e3b93936e71bd9870dd8e679cba838419c4f81d` |
| `v6/formats.ts` | `a90d2c84bdb7fb5533f699c7b9d50e0dee99ced7` | `727708b3d10014934dc7b3fcd2a14dd52336ce05` |
| `v6/log.ts` | `388ded57889d6993fd7fa5c0e27b019b32c9e811` | `edf8ce96d391a0ddc6be82318c22c67b6673432c` |
| `v6/target-values.ts` | `d6a3076084cdff2dbf2968793964501184a9db08` | 撤出（LIVE 也不存在） |
| `hand/screens/v6-room-projection.ts` | `1b8427f60b340534f8d46a38901b8a695c115e53` | `6b0c9c9d6878fff69f07b086169b7e54d3b6f2a8` |
