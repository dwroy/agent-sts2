# V5-S 运行评估（P4/P5 除外）

本报告只整理冻结窗口内的实测记录。缺失是未知；发布、自然使用和因果收益分别判断。

覆盖边界：`{"complete": false, "prior": {"complete": false, "runs": ["W1YY8PEWGUF9", "X7REGM0RUNSA"], "decision_rows": 700, "baseline": "W1 resumed native R341 ancestors at10:27UTC and11:40UTC; earlier run rows excluded", "current": "X7 completed R351 C1/C2-shadow only; no P1/P3/P2 new natural consumer yet", "calls": "decision-call records; request_ids retained. Failed requests without a decision may be absent", "predictions": "earliest available T1 selected-plan model probability per exact actual Boss attempt; whole-plan execution not claimed"}, "post_on_run": "RQCHNN0W72KF", "post_on_complete": true, "post_on_decisions": 772, "limits": "Baseline window remains partial; on run is complete. Actual attempts/native commits stay separate; cohort differences are descriptive, not causal.", "fixed_model_calibration_boundary": {"release": "V5-R362", "name": "S1.boss-calibration19", "fixed_model": "7e1193cef9467416bc10c8e344a49f4fd98390c7", "tune": 107, "validation": 438, "actual_production_different_inputs": 70, "current_production_recalibration_claimed": false, "wide_parent_closed": false}, "calibration_limit": "Native3d/bc98332 itself has an exact hostfull0, distinct from old6a55 full1 and metadata-only R362 registration. Fixed-model trust is not production recalibration;70 inputs differ. This is provenance for original V5-S runtime evidence, not a new calibration/adoption-parent closure. Runtime starts with the recorded9 dirty knowledge/notes leaves; the base commit full0 is not an exact full check of that uncommitted snapshot. The70-input difference is the original ops calibration readback, not a new per-call re-audit.", "metadata_correction": "/home/dw/Projects/agent-sts2/paper/materials/20261015-v5-s-completion/on-RQCHNN0W72KF/frozen-runtime-r2/lane-correction.json"}`

## 必需计算耗时

| 窗口 | 通道 | 实际尝试 | p50 ms | p90 ms | 最大 ms | 未知耗时 |
|---|---|---:|---:|---:|---:|---:|
| C1-C2-shadow-R351 | b3 | 4 | 4460.5 | 4731.5 | 4820 | 0 |
| R341-native-pre-S | b2 | 23 | 1098.0 | 5478.4000000000015 | 10472 | 0 |
| R341-native-pre-S | b3 | 25 | 7752.0 | 45596.0 | 69477 | 0 |
| V5-S-P2-C2-on | b2 | 57 | 2274.0 | 39454.6 | 97585 | 0 |
| V5-S-P2-C2-on | b3 | 45 | 13734.0 | 43166.2 | 140100 | 0 |

逐局累计观察等待与原始尝试计数在 evaluation.json；窗口不完整时不能称整局总等待。

## Jev 实际调用

| 窗口 | 调用 | 局数 | 已知总 token | token 完整调用 | 延迟 p50 ms | 延迟 p90 ms |
|---|---:|---:|---:|---:|---:|---:|
| C1-C2-shadow-R351 | 14 | 1 | 73091 | 14 | 494.5 | 566.6 |
| R341-native-pre-S | 141 | 1 | 1149164 | 141 | 572.0 | 774.0 |
| V5-S-P2-C2-on | 207 | 1 | 1819070 | 207 | 534.0 | 678.2 |

Jev 模式未因本报告改变；不同窗口局面不同，不将 token 或延迟差解释为架构因果。

## 排序偏离与真实 Boss 结果

{
  "groups": [
    {
      "cohort": "V5-S-P2-C2-on",
      "boss": "LAGAVULIN_MATRIARCH",
      "ascension": 10,
      "choices": 14,
      "overrides": 4,
      "override_rate": 0.2857142857142857,
      "missing_override_reason": 0,
      "outcomes": [
        {
          "deviated": false,
          "choices": 10,
          "outcome_bound_choices": 10,
          "unknown_outcome_choices": 0,
          "conflicting_outcome_ids": [],
          "distinct_boss_attempts": 1,
          "won": 1,
          "died": 0,
          "win_rate": 1.0
        },
        {
          "deviated": true,
          "choices": 4,
          "outcome_bound_choices": 4,
          "unknown_outcome_choices": 0,
          "conflicting_outcome_ids": [],
          "distinct_boss_attempts": 1,
          "won": 1,
          "died": 0,
          "win_rate": 1.0
        }
      ]
    },
    {
      "cohort": "V5-S-P2-C2-on",
      "boss": "KAISER_CRAB",
      "ascension": 10,
      "choices": 15,
      "overrides": 4,
      "override_rate": 0.26666666666666666,
      "missing_override_reason": 0,
      "outcomes": [
        {
          "deviated": false,
          "choices": 11,
          "outcome_bound_choices": 0,
          "unknown_outcome_choices": 11,
          "conflicting_outcome_ids": [],
          "distinct_boss_attempts": 0,
          "won": 0,
          "died": 0,
          "win_rate": null
        },
        {
          "deviated": true,
          "choices": 4,
          "outcome_bound_choices": 0,
          "unknown_outcome_choices": 4,
          "conflicting_outcome_ids": [],
          "distinct_boss_attempts": 0,
          "won": 0,
          "died": 0,
          "win_rate": null
        }
      ]
    },
    {
      "cohort": "V5-S-P2-C2-on",
      "boss": "QUEEN",
      "ascension": 10,
      "choices": 9,
      "overrides": 0,
      "override_rate": 0.0,
      "missing_override_reason": 0,
      "outcomes": [
        {
          "deviated": false,
          "choices": 9,
          "outcome_bound_choices": 9,
          "unknown_outcome_choices": 0,
          "conflicting_outcome_ids": [],
          "distinct_boss_attempts": 1,
          "won": 1,
          "died": 0,
          "win_rate": 1.0
        },
        {
          "deviated": true,
          "choices": 0,
          "outcome_bound_choices": 0,
          "unknown_outcome_choices": 0,
          "conflicting_outcome_ids": [],
          "distinct_boss_attempts": 0,
          "won": 0,
          "died": 0,
          "win_rate": null
        }
      ]
    }
  ],
  "excluded": [
    {
      "identity": "9fb8e469-f47b-4ba7-8d59-2ef32e91b15d",
      "reason": "not an actual on-mode resolved selection"
    },
    {
      "identity": "df356097-c1ab-4c54-93ff-75472d1c8fb0",
      "reason": "not an actual on-mode resolved selection"
    },
    {
      "identity": "e353b8d5-b77c-4733-b28c-cb1cd9eaa525",
      "reason": "not an actual on-mode resolved selection"
    },
    {
      "identity": "56b6b387-ef81-4511-8849-02ad5c9e391f",
      "reason": "not an actual on-mode resolved selection"
    }
  ],
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
    },
    {
      "boss": "LAGAVULIN_MATRIARCH",
      "ascension": 10,
      "attempt": "first",
      "cohort": "V5-S-P2-C2-on",
      "native_commit": "3d066a583631b85acb208813c31510864007adac",
      "n": 1,
      "brier": 0.002025000000000004,
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
          "n": 0,
          "predicted": null,
          "actual": null
        },
        {
          "lower": 0.8,
          "upper": 1.0,
          "n": 1,
          "predicted": 0.955,
          "actual": 1.0
        }
      ]
    },
    {
      "boss": "QUEEN",
      "ascension": 10,
      "attempt": "first",
      "cohort": "V5-S-P2-C2-on",
      "native_commit": "3d066a583631b85acb208813c31510864007adac",
      "n": 1,
      "brier": 1.0,
      "buckets": [
        {
          "lower": 0.0,
          "upper": 0.2,
          "n": 1,
          "predicted": 0.0,
          "actual": 1.0
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
          "n": 0,
          "predicted": null,
          "actual": null
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
    },
    {
      "prediction_id": "b363cec0-c3c6-40c0-b237-63354ec12959",
      "reason": "missing explicit identity, probability or actual outcome"
    },
    {
      "prediction_id": "9d2f1465-972f-4e63-862c-cadc3786ae65",
      "reason": "missing explicit identity, probability or actual outcome"
    },
    {
      "prediction_id": "e934d7a5-8762-458c-8016-75346d2e58d8",
      "reason": "missing explicit identity, probability or actual outcome"
    }
  ]
}

只纳入明确绑定原 Boss 尝试的预测；SL 截断不算死亡，后续胜利不倒填首试。原固定模型可信度整理另见 p0-boss-trust.md。

完整源 SHA、未知、重复和排除原因均保存在 evaluation.json；本报告不关闭发布与自然消费者验收。
