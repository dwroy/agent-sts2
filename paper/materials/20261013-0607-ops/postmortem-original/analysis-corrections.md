# 追加前分析失败与更正

原工具失败与初稿均保留在本会话日志及本任务目录；没有修改已追加的复盘。

- 首次列STATE文件时bubblewrap预检遇临时路径ENOENT：`.worktrees/codex-strategy-silent-20261013-054302-s2/.codex`。按同沙箱重读成功，未扩大权限。
- 初版metrics把原生usage读取为snake_case，得到0；原生记录是camelCase，最终4962274输入／32828输出。
- 初版metrics按rationale含fallback匹配到28条，实际均为大脑fallback order描述，布尔fallback=true为0。初版输出metrics.txt与最终metrics-complete.txt分开保留。
- 首轮metrics按每条必有chosen读取，遇改路记录KeyError: 'chosen'；改安全字段读取，保留缺字段事实，不报生产bug。
- 首轮笔记引用药水饮用d369614／休息d369834不精确，追加前核原行改为d369613／d369833；原稿lesson-draft-before-citation-check.md保留，正式稿逐字追加并校验。
