# 过程扫描：清单与精确叶

Roy 2026-10-18 批准磁盘治理第3项。新扫描用 `ops/record_manifest.py`，只接受逐项明确的叶路径；不 copytree 知识库、历史 paper 或主目录。原件保持，状态目录仅保存路径、字节数、SHA256、Git blob、精确源commit及脱敏结果。

```bash
python3 ops/record_manifest.py --root <原仓库> --state-dir <原OPS_DIR> \
  --ref <固定源码commit> --path <叶1> <叶2>
```

无 `--ref` 时冻结当前工作文件的确切字节；提交仍必须核这些字节和原HEAD没有变化。扫描器通过stdin消费冻结字节，不需要生成大目录。相同内容只有在扫描器二进制与默认策略身份一致、已有真实clean回执时复用；自定义配置可能引用外部规则，不借旧回执跳过。失败保存原manifest，不能把部分扫描当整套通过。

`ordinary_close.controlled_commit` 已直接接入，仍保独立index、排除已暂存文件、字节/HEAD CAS和并行记录拒绝。成功不新增ops唤醒；冲突/缺证/失败沿原事件。原19GiB扫描暂存不由本工具删除，交原ops按既有完成与恢复门禁回收。以后手工发布/记录扫描也用该精确入口，不再生整库扫描副本。
