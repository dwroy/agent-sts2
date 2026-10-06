# 运维交接：silent-0186已提交、合后基线检查阻塞，未上线

提案：/home/dw/Projects/agent-sts2/learner/runs/20261006-172733-strategy-proposal/proposal.md。来源UJ0K3G10609Y SILENT A10 F29（回合不适用）；XBD8Z9XLPCPN SILENT A10 F24/28/32（回合不适用）及F19/23/27/30/31/33 T2。既有账本0184/0185/0020，独立提案silent-0186。十指定局角色核对与原帧证据均落盘。

源码：9a865dbe87b4e64a5d50c59b389d99ed73bebb52（strategy-proposal-20261006-172733，干净）。仅补休息题现场充能、已见0→5的续火条件、充能指标并列及当前未模拟收益的说明；正充能再添火与坏stack未知，原HP、全部选项、评分、动作和模拟保持，铁甲等价。无新药水、SL或自动添火规则，无生成器修改。

撤生产接线：7失败1通过、exit1；恢复：8通过、exit0。源码沙箱入口exit0、tsc0、vitest主203文件2191例＋paths1文件11例，共204文件2202例；首过，无负载超时。初稿缺session夹具8失败、补齐原字段后8通过历史保留。源码／刷新／合入差异gitleaks各0。

正式flock内刷新七份知识提交3599ab0ae3be80d13b77f57f5af8b785cb09c437，incoming知识／重叠为空、merge-tree预检0。失败代码合入6b2a582dda7c8d745e092280724c0b94e5aca2af；合后tsc0，主vitest202文件2190例通过、1文件1例失败（共203文件2191例），276.03秒，入口exit1。失败为boss-clock.test.ts:191的ERPH既有断言，fightTurns实际8、期望>=9；不是高负载超时。入口set -e，paths没有运行，不记完整通过。

已用git reset --merge回退3599ab0ae3be80d13b77f57f5af8b785cb09c437（rollback_exit0），七份刷新数据与两个既有notes工作区差异保留；没有eval版本、上线记录或shipped。合后失败原日志live-suite.log/live-result.json/live-merge.log保留，没有重复跑完整套件冒称成功。

随后在相同刷新提交的锁内固定基线核对：knowledge工作区在前后均与HEAD一致，boss-clock源码、该测试及全部knowledge在失败合入与回退提交之间diff为空；回退源码也重现同一8>=9失败（baseline-targeted.log，exit1，1失败32未选择）。基线核对流程exit0，不表示测试通过。没有阅读或借用其他角色知识来修改公式/断言，没有放宽测试或新增排除；根因尚未定位。

请运维处理这项基线检查阻塞后兜底合入已测源码，实际通过及发布后再登记版本与silent-0186 shipped。目前仅经ledger.py/by=learner:strategy-proposal追加proposed及阻塞去向，旧0184/0185/0020首次证据／先验／历史保持。启动器strategy-done完成事件和本交接通知运维；不重复将已回退的6b2a582dda7c8d745e092280724c0b94e5aca2af当实际发布。未停对局、未运行play、未推送。
