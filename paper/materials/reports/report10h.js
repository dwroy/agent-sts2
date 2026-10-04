// 10-hour summary PDF (pdfkit + SimHei).
const PDFDocument = require("pdfkit");
const fs = require("fs");

const OUT = process.argv[2];
const doc = new PDFDocument({ size: "A4", margins: { top: 46, bottom: 46, left: 46, right: 46 } });
doc.pipe(fs.createWriteStream(OUT));
doc.registerFont("cn", "/mnt/c/Windows/Fonts/simhei.ttf");
doc.font("cn");
const W = doc.page.width - 92;
const ACCENT = "#1f4e79";
const GREY = "#555555";

const h1 = (t) => { ensure(60); doc.moveDown(0.5).fillColor(ACCENT).fontSize(14).text(t).moveDown(0.25); doc.fillColor("black").fontSize(10.5); };
const p = (t, o = {}) => doc.fillColor(o.color || "black").fontSize(o.size || 10.5).text(t, { lineGap: 2.5, ...o });
const bullets = (items) => items.forEach((t) => p("• " + t, { indent: 6 }));
function ensure(space) { if (doc.y + space > doc.page.height - 56) doc.addPage(); }
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cols = widths.map((w) => (w / total) * W);
  const pad = 3.5;
  const row = (cells, header) => {
    const h = Math.max(...cells.map((c, i) => doc.fontSize(9).heightOfString(String(c), { width: cols[i] - pad * 2 }))) + pad * 2;
    ensure(h + 4);
    let x = 46; const y = doc.y;
    if (header) doc.rect(46, y, W, h).fill("#dde6f0");
    doc.fillColor("black");
    cells.forEach((c, i) => { doc.fontSize(9).text(String(c), x + pad, y + pad, { width: cols[i] - pad * 2 }); x += cols[i]; });
    doc.moveTo(46, y + h).lineTo(46 + W, y + h).strokeColor("#bbbbbb").lineWidth(0.5).stroke();
    doc.x = 46; doc.y = y + h;
  };
  row(headers, true); rows.forEach((r) => row(r, false)); doc.moveDown(0.4); doc.fontSize(10.5);
}

doc.fillColor(ACCENT).fontSize(19).text("Jev 代打杀戮尖塔 2：最近 10 小时总结");
doc.fillColor(GREY).fontSize(9.5).text("2026-09-24 21:15 至 09-25 07:15（北京时间）｜铁甲战士，进阶 0｜兜底模型 DeepSeek（deepseek-flash，思考模式）");
doc.moveDown(0.6);
const boxY = doc.y;
doc.rect(46, boxY, W, 74).fill("#f3f6fa");
doc.fillColor("black").fontSize(10.5).text(
  "结论：18 局，0 胜。但 3 局打到了第三幕最终 boss（第 48 层），此前整个实验只有 1 局做到。三次分别输给实验体、永世沙漏（boss 只剩 33 血）和女王。瓶颈已从“第一、二幕的机制 bug”后移到“最终 boss 的机制和牌组输出不足”。这 10 小时做了 34 次代码提交，修掉了多处会系统性算错伤害的 bug。",
  52, boxY + 6, { width: W - 12, lineGap: 2.5 });
doc.x = 46; doc.y = boxY + 80;

h1("一、战绩（18 局）");
table(["局", "结束", "层数", "死于", "代码版本"], [
  ["VKPXGMV8YV31", "22:25", "33", "知识恶魔（选了瓦解诅咒）", "e9ff101"],
  ["Y83UP1RUC8R6", "22:46", "30", "熟睡甲虫（精英后被迫连战）", "e9ff101"],
  ["Z2H318ZMMAD0", "23:02", "17", "乐加维林族母（第 1 回合就打醒它）", "849e241"],
  ["1R3CUXT91TAE", "23:17", "17", "墨影幻灵（第 1 回合喝光药水）", "61418e0"],
  ["8LQGV1EFQDVX", "23:30", "17", "仪式兽（昏眩未建模，boss 剩 21 血）", "907bd0b"],
  ["2WUMK6PK5QHD", "01:30", "48", "最终 boss 实验体（三阶段）", "9321b3d"],
  ["1ZQJXQ53KSBG", "01:48", "17", "瀑布巨兽（输出太低）", "9321b3d"],
  ["1WSHZ8ML4EVF", "02:27", "33", "帝皇蟹（输出不足）", "9321b3d"],
  ["21TKTPL5D4A6", "02:40", "9", "精英花园幽灵鳗（护栏记账 bug）", "4cfdefc"],
  ["4LGQ5ZBC8DN7", "02:50", "9", "精英旧日雕像（护栏记账 bug）", "4cfdefc"],
  ["MD3FLLNB7Q2W", "03:21", "39", "三幕普通战（连打 5 场没休息）", "7997c07"],
  ["TQX5JJX3UD39", "04:11", "48", "最终 boss 永世沙漏（剩 33/512 血）", "39649dc"],
  ["PLCXM5MLTHP7", "04:43", "33", "帝皇蟹（水银沙漏触发蟹之怒）", "39649dc"],
  ["88HNFZ9K5LZ5", "05:31", "48", "最终 boss 女王（魂缚锁链）", "39649dc"],
  ["PU21Z67J65NE", "06:04", "33", "知识恶魔（衰朽诅咒）", "c68e0cb"],
  ["XJWF15R19UXF", "06:24", "22", "胧光怪（打会复活的寄生惧魔）", "7362cf1"],
  ["G8AQJ2YEMEHE", "06:43", "25", "精英蜂群术士（剩 8 血）", "7362cf1"],
  ["QE4KRWB1MB3X", "07:06", "22", "（复盘中）", "6fac0ce"],
], [2.2, 1, 0.8, 4.2, 1.4]);
bullets([
  "到最终 boss（第 48 层）3 局；到第二幕 boss（≥33 层）9 局；死在第一幕 boss（第 17 层）4 局。",
  "两局第 9 层的死亡是第三次规则调整引入的 bug（血量护栏额度被重复计数），已修复。",
]);

h1("二、决策分工与 DeepSeek 评估");
table(["项目", "数值"], [
  ["总决策数", "7,632"],
  ["代码直接决定", "6,178（81%）"],
  ["Jev 决定", "755（10%），Jev 共调用 1,454 次，217 万输入 token，约 $0.09"],
  ["DeepSeek 兜底", "590 次（8%）：战斗 335、事件 77、选牌 62、选牌界面 55、商店 40、路线 18"],
  ["DeepSeek 推翻 Jev", "303 次（51%）"],
  ["被血量护栏拦下", "76 次（DeepSeek/Jev 选了多掉血的线，代码改选更稳的）"],
  ["DeepSeek token", "输入 328 万（缓存命中 80%），输出 207 万（几乎全是思考）"],
  ["DeepSeek 费用", "约 $2.69（按高峰价；非高峰减半）"],
  ["DeepSeek 延迟", "中位 12.6 秒，90% 在 40.6 秒内；累计等待约 3 小时"],
], [2, 6]);
p("观察：DeepSeek 最大的系统性问题是“拿血换伤害”，反复用“燃烧之血会回血”“有瓶中精灵兜底”为理由放弃格挡。改攻略措辞没有用，最终靠代码的血量护栏兜住。费用很低，但慢：开思考后每次兜底平均十几秒。", { color: GREY, size: 9.5 });

h1("三、这 10 小时修掉的关键问题（34 次提交）");
p("会系统性算错数字的 bug（影响每一局）：", { color: ACCENT });
bullets([
  "易伤、虚弱、背后受击被重复计算：游戏显示的数字已经含这些修正，代码又乘了一次。结果易伤时高估受伤 50%、虚弱时低估输出 25%。",
  "巨像减伤减了两次；打击型药水、状态牌的失血被当成可格挡；“呼唤”打出时被多扣 6 血。",
  "血量护栏额度被重复计数（同一选择记两三次），导致两局第 9 层阵亡。",
]);
p("卡死（每次都在 15 分钟内被发现并修复）：", { color: ACCENT });
bullets([
  "附魔选牌界面“至多选 3 张”时一张不选就确认，mod 卡死（需人手点一次）。",
  "假商人房间没有商店数据，一直等待；多阶段 boss 转阶段时场上无活敌，一直等待。",
  "单局 90 分钟上限会在 boss 战中途打断，已改为 240 分钟且只在安全时机停止。",
]);
p("新建模的 boss / 精英机制：", { color: ACCENT });
bullets([
  "第一幕：瀑布巨兽自爆、乐加维林族母熟睡、仪式兽昏眩、灵魂异鱼呼唤。",
  "第二幕：无厌沙虫沙坑倒计时、帝皇蟹蟹之怒（含水银沙漏触发）、知识恶魔四种诅咒由代码选、千足虫复活节、幻象怪。",
  "第三幕最终 boss：实验体三阶段、永世沙漏的凋萎与人工制品、女王的魂缚锁链与“你是我的”。",
]);
p("策略层面：", { color: ACCENT });
bullets([
  "路线：按幕估算每场战斗的掉血，低血时避开连续普通战、多去休息点和商店；精英前的休息点优先回血。",
  "药水：boss 战每回合最多喝 1 瓶；普通战高危回合药水视为免费；修复“囤到必死才喝”。",
  "构筑：黑暗之拥/无惧疼痛需 3 张以上消耗牌才加分；战斗中临时选牌按当回合效果选。",
]);

h1("四、学习闭环运行情况");
bullets([
  "每局结束：子任务自动复盘，写入 notes/lessons.md（本期新增 18 局复盘）。",
  "每 5 局或同一原因连输两局：改规则代码（本期 6 次规则调整 + 多次即时修复），测试从 203 个增至 274 个。",
  "每 30 分钟：检查通关与卡死。本期 3 次卡死均由检查发现。",
]);

h1("五、判断与下一步");
bullets([
  "离首胜已经很近：3 次到最终 boss，其中永世沙漏只差 33 血。",
  "最大短板是牌组没有力量成长，打不动最终 boss 400–600 的有效血量。下一步要在选牌评分里提高力量、成长类牌的权重，并针对最终 boss 调整构筑。",
  "进阶 10 仍很远：需要先稳定通关进阶 0，再逐级解锁。",
]);
doc.moveDown(0.6);
p("数据来源：jev-sts2/logs/decisions.jsonl、runs.jsonl、states.jsonl、deepseek-reasoning.jsonl；复盘 notes/lessons.md；代码 phase2 分支（本地，未推送）。", { color: GREY, size: 8.5 });
doc.end();
