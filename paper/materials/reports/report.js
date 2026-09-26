// Build the Chinese progress report PDF (pdfkit + SimHei from the Windows font folder).
const PDFDocument = require("pdfkit");
const fs = require("fs");

const OUT = process.argv[2];
const FONT = "/mnt/c/Windows/Fonts/simhei.ttf";
const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
doc.pipe(fs.createWriteStream(OUT));
doc.registerFont("cn", FONT);
doc.font("cn");

const W = doc.page.width - 100;
const ACCENT = "#1f4e79";
const GREY = "#555555";

function h1(text) {
  doc.moveDown(0.6).fillColor(ACCENT).fontSize(15).text(text).moveDown(0.3);
  doc.fillColor("black").fontSize(10.5);
}
function p(text, opts = {}) {
  doc.fillColor(opts.color || "black").fontSize(opts.size || 10.5).text(text, { lineGap: 3, ...opts });
}
function bullets(items) {
  for (const item of items) p("• " + item, { indent: 8 });
}
function ensure(space) {
  if (doc.y + space > doc.page.height - 60) doc.addPage();
}
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cols = widths.map((w) => (w / total) * W);
  const pad = 4;
  const drawRow = (cells, header) => {
    const heights = cells.map((cell, i) => doc.fontSize(9.5).heightOfString(String(cell), { width: cols[i] - pad * 2 }));
    const h = Math.max(...heights) + pad * 2;
    ensure(h + 4);
    let x = 50;
    const y = doc.y;
    if (header) doc.rect(50, y, W, h).fill("#dde6f0");
    doc.fillColor("black");
    cells.forEach((cell, i) => {
      doc.fontSize(9.5).text(String(cell), x + pad, y + pad, { width: cols[i] - pad * 2 });
      x += cols[i];
    });
    doc.moveTo(50, y + h).lineTo(50 + W, y + h).strokeColor("#bbbbbb").lineWidth(0.5).stroke();
    doc.x = 50;
    doc.y = y + h;
  };
  drawRow(headers, true);
  rows.forEach((row) => drawRow(row, false));
  doc.moveDown(0.5);
  doc.fontSize(10.5);
}

// ---- Title
doc.fillColor(ACCENT).fontSize(20).text("Jev 代打杀戮尖塔 2：阶段报告", { align: "left" });
doc.fillColor(GREY).fontSize(10).text("截至 2026-09-24 14:49 ｜ xdwin（Windows 跑游戏，WSL 跑控制器）｜ 铁甲战士，进阶 0");
doc.moveDown(0.8);
doc.rect(50, doc.y, W, 62).fill("#f3f6fa");
doc.fillColor("black").fontSize(11).text(
  "结论：还没有赢过一局（已结束 8 局，0 胜）。从「只能打到第 7 层」进步到「稳定过第一幕 boss，三次打到第二幕 boss」；第 9 局刚刚首次打过第二幕 boss，进入第三幕（第 34 层）。Jev 置信度普遍很低，最大的提升来自代码的整回合计算和 Claude 对高风险题的判断。",
  56, doc.y - 56, { width: W - 12, lineGap: 3 },
);
doc.x = 50;
doc.moveDown(1.2);

// ---- 1. Results
h1("一、战绩");
table(
  ["局", "最高层数", "结果", "当时的主要变化"],
  [
    ["1", "7", "负", "原版：纯 Jev 逐张出牌"],
    ["2", "17", "负（第一幕 boss 墨影幻灵）", "原版，作为对照组"],
    ["3", "22", "负", "上线整回合求解器、选牌评分；首次过第一幕 boss"],
    ["4", "22", "负", "改为 Claude 兜底；过第一幕 boss"],
    ["5", "33", "负（第二幕 boss 前一层）", "过第一幕 boss"],
    ["6", "17", "负（墨影幻灵）", "—"],
    ["7", "13", "负", "某些参数改动起了副作用"],
    ["8", "33", "负（第二幕 boss 知识恶魔，打到它只剩 35 血）", "上线出招预测"],
    ["9", "34+", "进行中：首次打过第二幕 boss，进入第三幕", "过瀑布巨兽；第二幕 boss 用「遭到包围」转身打法"],
  ],
  [0.6, 1, 3, 4],
);
bullets(["胜率：0 / 8。", "过第一幕 boss：5 次（第 3、4、5、8、9 局）。", "到达第二幕 boss：3 次（第 5、8、9 局）；打过第二幕 boss：1 次（第 9 局）。"]);

// ---- 2. API
h1("二、接口请求");
table(
  ["模型", "请求次数", "用量", "花费", "延迟"],
  [
    ["Jev（经 OpenRouter）", "667", "103 万输入 / 4.9 万输出 token", "约 $0.045", "中位 575 ms，p95 960 ms"],
    ["Claude（本 session）", "156", "本 session 对话额度", "—", "作答中位 13 秒"],
    ["DeepSeek", "16", "1.6 万 token", "约 $0.01", "约 1 秒"],
  ],
  [2, 1, 2.6, 1.2, 2.2],
);
p("DeepSeek 前 10 次是切换到「Claude 优先」之前的兜底，后 6 次是 Claude 90 秒内未答或答了无效选项时接手。", { color: GREY, size: 9.5 });

// ---- 3. Deciders
h1("三、决策者分布（全部 3,764 个决策）");
table(
  ["决策者", "次数", "占比", "负责什么"],
  [
    ["代码", "2,876", "76%", "整回合求解、斩杀、明显最优方案、领奖励、路线、商店、删牌等"],
    ["Jev", "480（另执行 156 步其方案）", "13% + 4%", "在接近的方案之间拍板，74% 是战斗题"],
    ["Claude", "156（另执行 66 步其方案）", "4% + 2%", "高风险题：精英、boss、事件、选牌、商店"],
    ["DeepSeek", "16", "<1%", "超时时的最后兜底"],
    ["代码兜底", "15", "<1%", "普通战斗中 Jev 太没把握时"],
  ],
  [1.2, 2, 1.2, 4],
);

// ---- 4. Jev
h1("四、Jev 的判断");
table(
  ["置信度", "次数", "占比"],
  [
    ["< 0.2", "106", "16%"],
    ["0.2 ~ 0.35", "159", "24%"],
    ["0.35 ~ 0.5", "159", "24%"],
    ["0.5 ~ 0.75", "161", "25%"],
    ["≥ 0.75", "67", "10%"],
  ],
  [2, 1, 1],
);
p("约三分之二的回答置信度不到 0.5，Jev 大多数时候没有把握。");
ensure(120);
table(
  ["Jev 所选方案在代码评分中的排名（战斗方案题）", "次数", "占比"],
  [
    ["第 1", "93", "69%"],
    ["第 2", "29", "22%"],
    ["第 3", "7", "5%"],
    ["第 4", "5", "4%"],
  ],
  [4, 1, 1],
);
p("Jev 多数时候在附和代码的最优解；它最有价值的地方，是给出「没把握」的信号，把难题交出去。");

// ---- 5. Escalation
ensure(200);
h1("五、兜底模型的纠正");
table(
  ["", "复核次数", "同意 Jev", "纠正 Jev", "纠正率"],
  [
    ["Claude", "156", "63", "93", "60%"],
    ["DeepSeek", "16", "7", "9", "56%"],
  ],
  [2, 1, 1, 1, 1],
);
table(
  ["题型（Claude）", "复核", "纠正", "纠正率"],
  [
    ["选牌界面（删牌、升级、消耗、加入牌组）", "21", "17", "81%"],
    ["选牌奖励", "31", "21", "68%"],
    ["商店", "16", "10", "63%"],
    ["事件", "19", "11", "58%"],
    ["战斗方案", "65", "32", "49%"],
    ["路线", "4", "2", "50%"],
  ],
  [4, 1, 1, 1],
);
p("Jev 在构筑类决策（选牌、升级、删牌、商店）上最弱，战斗方案相对好一些。");
ensure(160);
p("影响较大的几次纠正：", { color: ACCENT });
bullets([
  "构筑：第 4 局选恶魔形态而非预备打击；第 5 局阻止 Jev 用「瓶中精灵」（死亡时救命）换牌；第 8 局发现「烘焙手套 + 彼岸咆哮」「烘焙手套 + 邪眼」两个配合，后写成代码规则。",
  "药水时机：凌虐留到敌人出重击的回合；第 8 局对墨影幻灵把固化药水留到肢解那回合；第 9 局判断「复制药水 + 预备打击」能斩杀精英并成功。",
  "boss 战：第 8 局在知识恶魔身上用撕裂，把它施加的持续扣血变成每回合 +1 力量；二选一负面效果时，血量低就选「懒惰」而不叠第二层「瓦解」；第 9 局发现「遭到包围」机制，用攻击药水转身面对火箭，少挨约 13 点。",
  "识别坏题：多次发现候选项本身有问题（「加入牌组」被当成删牌、手牌没抽完就出题等），顺手修了代码。",
]);

// ---- 6. Code
ensure(160);
h1("六、代码迭代");
bullets([
  "phase2 本地分支：55 次提交，167 个测试全部通过，未推送任何远端。",
  "求解器：从「逐张问 Jev」改为「代码搜索整回合所有出牌顺序」，建模约 40 种敌我能力、15 种药水、状态牌的回合末伤害，以及从日志学到的出招预测。",
  "最致命的几个 bug（均已修复）：回合开始手牌没抽完、能量没回满就开始规划甚至直接结束回合（第 4、5 局死因）；比较方案时没把用掉药水算作代价；「加入牌组」「放回抽牌堆顶」被误判成删牌；「懒惰」「瓦解」未建模（第 8 局在 boss 剩 35 血时阵亡）。",
]);

// ---- 7. Outlook
h1("七、判断和下一步");
bullets([
  "瓶颈正在后移：第二幕 boss 前两次都只差一口气，补上缺失的机制后，第 9 局首次打过，进入第三幕。",
  "离进阶 10 还很远：还没通关进阶 0，而进阶要逐级解锁。下一个里程碑是拿到第一胜。",
  "分工结论：Jev 不适合单独做构筑决策，但很适合当「没把握」的探测器；真正拉开差距的是代码计算和 Claude 的兜底判断。",
]);

doc.moveDown(1);
p("数据来源：jev-sts2/logs/decisions.jsonl、states.jsonl、escalation/；统计脚本 ops/stats.py。", { color: GREY, size: 9 });
doc.end();
