# V5-S 运行评估（P4/P5 除外）

本报告只整理冻结窗口内的实测记录。缺失是未知；发布、自然使用和因果收益分别判断。

覆盖边界：`{"complete": false, "runs": ["W1YY8PEWGUF9", "X7REGM0RUNSA"], "decision_rows": 700, "baseline": "W1 resumed native R341 ancestors at10:27UTC and11:40UTC; earlier run rows excluded", "current": "X7 completed R351 C1/C2-shadow only; no P1/P3/P2 new natural consumer yet", "calls": "decision-call records; request_ids retained. Failed requests without a decision may be absent", "predictions": "earliest available T1 selected-plan model probability per exact actual Boss attempt; whole-plan execution not claimed"}`

## 必需计算耗时

| 窗口 | 通道 | 实际尝试 | p50 ms | p90 ms | 最大 ms | 未知耗时 |
|---|---|---:|---:|---:|---:|---:|
| C1-C2-shadow-R351 | b3 | 4 | 4460.5 | 4731.5 | 4820 | 0 |
| R341-native-pre-S | b2 | 23 | 1098.0 | 5478.4000000000015 | 10472 | 0 |
| R341-native-pre-S | b3 | 25 | 7752.0 | 45596.0 | 69477 | 0 |

逐局累计观察等待与原始尝试计数在 evaluation.json；窗口不完整时不能称整局总等待。

## Jev 实际调用

| 窗口 | 调用 | 局数 | 已知总 token | token 完整调用 | 延迟 p50 ms | 延迟 p90 ms |
|---|---:|---:|---:|---:|---:|---:|
| C1-C2-shadow-R351 | 14 | 1 | 73091 | 14 | 494.5 | 566.6 |
| R341-native-pre-S | 141 | 1 | 1149164 | 141 | 572.0 | 774.0 |

Jev 模式未因本报告改变；不同窗口局面不同，不将 token 或延迟差解释为架构因果。

## 排序偏离与真实 Boss 结果

{
  "groups": [],
  "excluded": [],
  "limits": "Descriptive associations only; one Boss attempt may appear in both choice groups. No later SL win is substituted for a first attempt, and shadow choices do not count as instructed overrides."
}

只纳入实际 on 题面之后、目标已确定的选择。相同 Boss 尝试在组内去重；一战可出现在两个选择组，不把它当独立对照。

## 首试与 SL 校准

{
  "groups": [
    {
      "boss": "WATERFALL_GIANT",
      "ascension": 10,
      "attempt": "sl",
      "cohort": "R341-native-pre-S",
      "native_commit": "93cedf7ecc10d9dba9ba138e45df98b021875920",
      "n": 1,
      "brier": 0.10824099999999998,
      "buckets": [
        {
          "lower": 0.0,
          "upper": 0.2,
          "n": 0,
          "predicted": null,
          "actual": null
        },
        {
          "lower": 0.2,
          "upper": 0.4,
          "n": 0,
          "predicted": null,
          "actual": null
        },
        {
          "lower": 0.4,
          "upper": 0.6,
          "n": 0,
          "predicted": null,
          "actual": null
        },
        {
          "lower": 0.6,
          "upper": 0.8,
          "n": 1,
          "predicted": 0.671,
          "actual": 1.0
        },
        {
          "lower": 0.8,
          "upper": 1.0,
          "n": 0,
          "predicted": null,
          "actual": null
        }
      ]
    }
  ],
  "excluded": [
    {
      "prediction_id": "de00d45c-4f8b-4f8a-905d-3b8bd121d1d8",
      "reason": "missing explicit identity, probability or actual outcome"
    }
  ]
}

只纳入明确绑定原 Boss 尝试的预测；SL 截断不算死亡，后续胜利不倒填首试。原固定模型可信度整理另见 p0-boss-trust.md。

完整源 SHA、未知、重复和排除原因均保存在 evaluation.json；本报告不关闭发布与自然消费者验收。
