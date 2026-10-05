# 修复批次部分上线核实

记录时间：2026-10-05 11:15。事件批次20261005-094524-fix-batch，学习者归档20261005-094525-fix-batch；回报ops/codex-ops/learner/20261005-094524-fix-batch.out及归档handoff-ops.md。

{
  "shipped_sources": [
    "afd652a3f75df6e7403439f01c565220327884da",
    "f670884a188a047bbd3f7f007c260ade62fae36a",
    "a4f4ec868d122dc92af510862c6240cf2eaff2b6",
    "233ede56047274ba53a4e1191a245fac816c37a8",
    "87c89b7aea90c7275e0fbb04b1e4148a4209630c",
    "cd55a88517ed1d44c3f8bf64e0c9f2ab14ccb2e2"
  ],
  "pending_sources": [
    "3cd9fc6c6b6bfa378508f7bd5ca2219c1088ad39",
    "e3e7068b028e9d9bb75441b99a973161e9d90f4d"
  ],
  "version": "S1.fix11",
  "live_refresh": "452f7bc7ac23bd1464fe04b951272236f471de8d"
}

前六项均为main/live祖先，已有S1.fix11不重复登记；只按学习者交接追加0078模型shipped，0080/0084为机制引用且已有经验上线记录。学习者前六项合后沙箱tsc0/163文件1951用例；后两项源分支165/1957成功，但live两次复验均164文件1946用例通过/2失败（两次vitest exit1）。回退后两源码均非main/live祖先，无S1.fix12。相同452f7bc7固定快照的旧基线与修后potion-cost测试都2失败23通过，失败298/307，见potion-snapshot-baseline-source.log和potion-snapshot-fixed-source.log；根因未确定，未重新跑同样失败检查。

未运行learner-recheck整批：全部源提交校验不满足，保留原merged=null和失败历史。上一轮061d1ca9动作说明修复的父86b24a1f含已撤回模型；待manual在当前live基线上只cherry-pick该单提交，不能整枝合并以免带回未通过模型。原动作说明回归/沙箱成功记录保留，不能当新基线live合后成功。对局继续，未改配置或游戏知识。
