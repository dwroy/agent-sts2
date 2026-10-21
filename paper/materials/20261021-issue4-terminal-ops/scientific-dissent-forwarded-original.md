
### 2026-10-21T11:38:46+08:00 #4 精英模拟学习三项科学异议（原文）

原学习批次issue-4-elite-calibration-20261021-104312已退出0；本ops已核99输入、33产物、3895原行/771 Git blob，无差异。以下为学习者原文，不是ops新增游戏知识；四候选仍waiting，无发布/父完成。

[
  {
    "id": "D1",
    "prior": "原审计称真实开场保留可用牌堆；缺显式牌堆时才deck-minus-hand。",
    "finding": "显式牌堆在原字节中存在；是冻结提取主动剥离。ET1一场还造成六张重复身份和升级失配。保留原结果作原管线诊断，不称完整真实开场控制。",
    "evidence": [
      "ET1QAZCV8GUP-f31-fight11（Silent A10/F31/T1可行动），logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2",
      "source-excerpts.md: parse_state_line / boardOf / findIndex"
    ],
    "affected_ids": [
      "silent-elite-simulation-pessimism-20261021",
      "issue-4",
      "silent-proposal-e76e895381da5bfc"
    ],
    "next_step": "原ops接收本异议，沿原通知CLI实际写入watcher与Roy收件箱并取得各角色真实回执；先做无MC输入保真回归。"
  },
  {
    "id": "D2",
    "prior": "原授权：“当前不影响R407运行：拿牌比较用同种子配对差。”",
    "finding": "不否定原调度决定，但拒绝把其理由外推为配对增量已校准或排名可靠。本窗口只比较绝对结果，无候选反事实，且有状态/牌身份相关偏差。",
    "evidence": [
      "issue输入内elite-learning-authorization-original.md，SHA25ae2141a16fa4fc61c48d00943240a0a5fb3340bd6627d663c2d17606a34d25",
      "ET1QAZCV8GUP-f31-fight11（Silent A10/F31/T1可行动），logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2"
    ],
    "affected_ids": [
      "silent-elite-simulation-pessimism-20261021",
      "issue-4",
      "R407论证边界"
    ],
    "next_step": "原ops→watcher→Roy实际告知，单独验证候选增量；保持CARDbrain/REFLEXoff，不将CEN或预测器子项完成当本issue完成。"
  },
  {
    "id": "D3",
    "prior": "原审计将净损描述为入场至终局；实际使用fight.hp_loss，两场胜利只覆盖到最后COMBAT帧。",
    "finding": "ET1 F9最后战斗42到退出39、2XCG F9最后战斗25到退出19；合9HP未纳原“净损”。保留原统计并并列退出口径均值27.4038、模拟残差+10.7151，原因不补值。",
    "evidence": [
      "ET1QAZCV8GUP-f9-fight4（Silent A10/F9/T1可行动），logs/states.jsonl offset=14287839500 bytes=30795 SHA256=b4622465a1aeb30caece92f41cf74f007f199358cb33710f2d933b6c68db6469",
      "logs/states.jsonl offset=14288657897 bytes=20832 SHA256=e6fc793496976edde0a4815b23ab8d0bebfc30cc0ce946349bc440d93a779a90",
      "2XCG8LXUZLRE-f9-fight5（Silent A10/F9/T1可行动），logs/states.jsonl offset=14516553453 bytes=30452 SHA256=9de6174c27382f0546c6348a5e2b0a5078caa8374aff1b708d05166ec10d08fd",
      "logs/states.jsonl offset=14517771530 bytes=20474 SHA256=fbd7cdd050b057e3a47517fb9173ae9c51eac0473cab8015aa52498ce09c7223"
    ],
    "affected_ids": [
      "silent-elite-simulation-pessimism-20261021",
      "issue-4",
      "原审计净掉血口径"
    ],
    "next_step": "原ops沿通知链实际告知，固定索引补核两段跨界HP事件；不得用无归因9HP拟伤害参数。"
  }
]

原文 learner/runs/20261021-104418-def3aea5-81a4-47a6-85d4-5dd8fb129249-issue-4-elite-calibration-task/disagreements.json SHA256 012008f5419fb0411d3682762626ce546478a3bdaf4563aae0041a7e275f61e3；完整报告与三notice对应见 paper/materials/20261021-issue4-terminal-ops/。新研究任务未获原manual ACK白名单支持，CLI角色登记另记结果；实际watcher读取及Roy可见转达仍pending，不代填角色ACK。
