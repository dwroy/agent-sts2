# Roy授权静默boss定期校准刷新回报

本批是新功能定期刷新；task=fix-batch仅为完成事件通道。实际源码、固定发布树、检查与账本如下；shipped和完整外部检查由运维/调度器据实际确认。

```json
{
  "task": "fix-batch",
  "base": "54d5f6f42841b6e78ebe884d50bc9524960c257c",
  "fixes": [
    {
      "item": "Roy 已授权新功能：静默 boss 模拟校准",
      "commit": "9d96afd014700b629c37fea0d05be766490fb3da",
      "nature": "定期校准数据刷新，20新增实际结局触发、20可用开场只扩验证；沿用已有代码，不冒标bug-infra",
      "implementation_commit": "cdf75af64fb5b118a5a808ecb3b05e2a05991c36",
      "implementation_is_published_ancestor": true,
      "source_parent": "49c01a0280347a29b6ef1ae2bf79b4b964bed4a0",
      "test": "agent/tools/boss-sim/test_silent_calibration.py; ops/tests/test_silent_calibration_dispatch.py; agent/tests/silent-boss-calibration*.test.ts; agent/tools/test-sandbox.sh",
      "fails_without_fix": false,
      "fails_without_fix_reason": "定期统计刷新，无新生产源码；不伪造纯bug红绿",
      "ledger_id": "silent-0283",
      "ledger_kind": "fight",
      "ledger_status": "proposed",
      "actual_merge": "96aeaf636a2b806c435db89673590f8229b22b58",
      "published_commit": "f89476513e37ba1bfe269f820f5147740adb5a67",
      "published_tree": "4a24dcd1a118a0b388310f2b44a93fddb4e9ca5b",
      "version": "S1.boss-calibration4"
    }
  ],
  "skipped": [
    {
      "item": "silent-0213及其他队列bug",
      "reason": "本批只做Roy授权静默boss校准刷新"
    },
    {
      "item": "TXZ6RVMQA09D F49实际死亡",
      "reason": "保留实际结局来源；缺首回合决策帧，排除出模拟/拟合"
    },
    {
      "item": "K3676LU8B0UH F48尝试2",
      "reason": "固定模型t1/pre均board no solve；保留原件，不补预测、不计入拟合成功场数"
    }
  ],
  "merged": "96aeaf636a2b806c435db89673590f8229b22b58",
  "published_commit": "f89476513e37ba1bfe269f820f5147740adb5a67",
  "published_tree": "4a24dcd1a118a0b388310f2b44a93fddb4e9ca5b",
  "version": "S1.boss-calibration4",
  "commits": [
    "9d96afd014700b629c37fea0d05be766490fb3da",
    "96aeaf636a2b806c435db89673590f8229b22b58",
    "f89476513e37ba1bfe269f820f5147740adb5a67"
  ],
  "artifact": "96b9fda6cff406e564bc312401fa29c267a779b508a75eb76e9d00a1db2cf887",
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "files": 247,
    "cases": 2604,
    "source_sandbox": {
      "exit": 0,
      "tsc": 0,
      "vitest": 0,
      "files": 246,
      "cases": 2598,
      "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/source-sandbox.log"
    },
    "pre_merge_sandbox": {
      "exit": 0,
      "tsc": 0,
      "vitest": 0,
      "files": 247,
      "cases": 2604,
      "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/live-pre-save-sandbox.log"
    },
    "post_merge_sandbox": {
      "exit": 0,
      "tsc": 0,
      "vitest": 0,
      "files": 247,
      "cases": 2604,
      "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/live-sandbox.log"
    },
    "python_fixed_fixtures": {
      "python-tests": {
        "exit": 0,
        "cases": 12,
        "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/python-tests.log"
      },
      "python-dispatch-tests": {
        "exit": 0,
        "cases": 20,
        "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/python-dispatch-tests.log"
      }
    },
    "fixed_artifact_checks": {
      "cached_archive_skipped": true,
      "identical_output_bytes": true,
      "zero_new_events_skip_preserves_outputs": true,
      "fixed_refit_exact": true,
      "artifact": "96b9fda6cff406e564bc312401fa29c267a779b508a75eb76e9d00a1db2cf887"
    },
    "shard_integrity": {
      "shards": 2,
      "processes_max": 4,
      "nice": 19,
      "result_pairs": 440,
      "duplicate_pairs": 0,
      "original_index_seeds_preserved": true,
      "serial_order_restored": true,
      "serial_reference_rows_equal_except_timing": 13,
      "all_model_inputs_unchanged": true,
      "canonical_results_sha256": "81020687e795c565801574fe2ae4c0b8cda55eefb706d33feff68809b0a3804c"
    },
    "external": "调度器补跑完整tsc/vitest，尚未取得结果，不冒报通过",
    "final_verification": {
      "published_tree": "4a24dcd1a118a0b388310f2b44a93fddb4e9ca5b",
      "source_blobs_match_fixed_publication": 36,
      "feature_agent_code_unchanged": true,
      "unique_version": "S1.boss-calibration4",
      "ledger": "silent-0283",
      "kind": "fight",
      "status": "proposed",
      "evidence": 20,
      "old_archive_unchanged": true,
      "original_and_audit_checksums_valid": true
    }
  },
  "evidence": {
    "finished_silent_runs": 120,
    "attempts": 546,
    "usable_openings": 220,
    "actual_usable_outcomes": {
      "won": 160,
      "died": 60
    },
    "successful_simulated_openings": 219,
    "simulation_errors": [
      {
        "key": "K3676LU8B0UH:48:2:6525158984",
        "start": "t1",
        "error": "board: Error: no solve"
      },
      {
        "key": "K3676LU8B0UH:48:2:6525158984",
        "start": "pre",
        "error": "board: Error: no solve"
      }
    ],
    "new_completed_events": 20,
    "new_usable_validation": 20,
    "exclusions": {
      "SL predicted_death: censored, no actual win/loss; no observed completed outcome": 324,
      "SL predicted_death: censored, no actual win/loss; no observed completed outcome; no turn-1 decision with drawn hand": 1,
      "no turn-1 decision with drawn hand": 1
    },
    "snapshot_ended_max": "2026-10-07T22:15:02.084Z",
    "tune": 107,
    "val": 113,
    "cutoff_UTC": "2026-10-06T02:46:11.648000"
  },
  "boss_trust": [
    {
      "boss": "AEONGLASS",
      "name": "永世沙漏",
      "B2": {
        "n": 6,
        "missing": 4,
        "brier": 0.3066,
        "gap": 0.376,
        "leak_ratio": 3.114,
        "failed": [
          "n",
          "brier",
          "gap",
          "leak"
        ],
        "trusted": false
      },
      "B3": {
        "n": 6,
        "missing": 4,
        "brier": 0.3008,
        "gap": 0.374,
        "leak_ratio": 3.186,
        "failed": [
          "n",
          "brier",
          "gap",
          "leak"
        ],
        "trusted": false
      }
    },
    {
      "boss": "CEREMONIAL_BEAST",
      "name": "仪式兽",
      "B2": {
        "n": 13,
        "missing": 0,
        "brier": 0.0267,
        "gap": -0.012,
        "leak_ratio": 1.023,
        "failed": [],
        "trusted": true
      },
      "B3": {
        "n": 13,
        "missing": 0,
        "brier": 0.0255,
        "gap": -0.022,
        "leak_ratio": 1.081,
        "failed": [],
        "trusted": true
      }
    },
    {
      "boss": "KAISER_CRAB",
      "name": "帝王蟹",
      "B2": {
        "n": 13,
        "missing": 0,
        "brier": 0.1145,
        "gap": 0.095,
        "leak_ratio": 1.166,
        "failed": [],
        "trusted": true
      },
      "B3": {
        "n": 13,
        "missing": 0,
        "brier": 0.1247,
        "gap": 0.098,
        "leak_ratio": 1.16,
        "failed": [],
        "trusted": true
      }
    },
    {
      "boss": "KNOWLEDGE_DEMON",
      "name": "知识恶魔",
      "B2": {
        "n": 14,
        "missing": 0,
        "brier": 0.0638,
        "gap": -0.038,
        "leak_ratio": 1.145,
        "failed": [],
        "trusted": true
      },
      "B3": {
        "n": 14,
        "missing": 0,
        "brier": 0.0537,
        "gap": -0.042,
        "leak_ratio": 1.216,
        "failed": [],
        "trusted": true
      }
    },
    {
      "boss": "LAGAVULIN_MATRIARCH",
      "name": "乐加维林族母",
      "B2": {
        "n": 12,
        "missing": 0,
        "brier": 0.044,
        "gap": 0.068,
        "leak_ratio": 1.008,
        "failed": [],
        "trusted": true
      },
      "B3": {
        "n": 12,
        "missing": 0,
        "brier": 0.0284,
        "gap": 0.044,
        "leak_ratio": 1.139,
        "failed": [],
        "trusted": true
      }
    },
    {
      "boss": "QUEEN",
      "name": "女王",
      "B2": {
        "n": 5,
        "missing": 5,
        "brier": 0.3131,
        "gap": 0.398,
        "leak_ratio": 0.918,
        "failed": [
          "n",
          "brier",
          "gap"
        ],
        "trusted": false
      },
      "B3": {
        "n": 5,
        "missing": 5,
        "brier": 0.3381,
        "gap": 0.412,
        "leak_ratio": 0.971,
        "failed": [
          "n",
          "brier",
          "gap"
        ],
        "trusted": false
      }
    },
    {
      "boss": "SOUL_FYSH",
      "name": "灵魂异鱼",
      "B2": {
        "n": 11,
        "missing": 0,
        "brier": 0.098,
        "gap": 0.093,
        "leak_ratio": 0.812,
        "failed": [],
        "trusted": true
      },
      "B3": {
        "n": 11,
        "missing": 0,
        "brier": 0.1108,
        "gap": 0.106,
        "leak_ratio": 0.793,
        "failed": [],
        "trusted": true
      }
    },
    {
      "boss": "TEST_SUBJECT",
      "name": "实验体",
      "B2": {
        "n": 5,
        "missing": 5,
        "brier": 0.1233,
        "gap": 0.351,
        "leak_ratio": 3.018,
        "failed": [
          "n",
          "gap",
          "leak"
        ],
        "trusted": false
      },
      "B3": {
        "n": 5,
        "missing": 5,
        "brier": 0.103,
        "gap": 0.321,
        "leak_ratio": 2.752,
        "failed": [
          "n",
          "gap",
          "leak"
        ],
        "trusted": false
      }
    },
    {
      "boss": "THE_INSATIABLE",
      "name": "无厌沙虫",
      "B2": {
        "n": 8,
        "missing": 2,
        "brier": 0.1242,
        "gap": -0.032,
        "leak_ratio": 1.446,
        "failed": [
          "n",
          "leak"
        ],
        "trusted": false
      },
      "B3": {
        "n": 8,
        "missing": 2,
        "brier": 0.1227,
        "gap": -0.038,
        "leak_ratio": 1.463,
        "failed": [
          "n",
          "leak"
        ],
        "trusted": false
      }
    },
    {
      "boss": "THE_KIN",
      "name": "同族",
      "B2": {
        "n": 6,
        "missing": 4,
        "brier": 0.2002,
        "gap": -0.024,
        "leak_ratio": 1.36,
        "failed": [
          "n",
          "brier",
          "leak"
        ],
        "trusted": false
      },
      "B3": {
        "n": 6,
        "missing": 4,
        "brier": 0.1774,
        "gap": 0.012,
        "leak_ratio": 1.343,
        "failed": [
          "n",
          "brier",
          "leak"
        ],
        "trusted": false
      }
    },
    {
      "boss": "VANTOM",
      "name": "墨影幻灵",
      "B2": {
        "n": 9,
        "missing": 1,
        "brier": 0.1602,
        "gap": 0.163,
        "leak_ratio": 1.043,
        "failed": [
          "n",
          "brier",
          "gap"
        ],
        "trusted": false
      },
      "B3": {
        "n": 9,
        "missing": 1,
        "brier": 0.172,
        "gap": 0.174,
        "leak_ratio": 0.991,
        "failed": [
          "n",
          "brier",
          "gap"
        ],
        "trusted": false
      }
    },
    {
      "boss": "WATERFALL_GIANT",
      "name": "瀑布巨兽",
      "B2": {
        "n": 11,
        "missing": 0,
        "brier": 0.0925,
        "gap": 0.035,
        "leak_ratio": 0.94,
        "failed": [],
        "trusted": true
      },
      "B3": {
        "n": 11,
        "missing": 0,
        "brier": 0.0891,
        "gap": 0.046,
        "leak_ratio": 0.925,
        "failed": [],
        "trusted": true
      }
    }
  ],
  "A10_residuals": {
    "t1": {
      "n": 113,
      "gap": 0.08700000000000008,
      "brier": 0.1151,
      "mean_pred": 0.777,
      "actual_win": 0.69,
      "leak_ratio": 1.218
    },
    "pre": {
      "n": 113,
      "gap": 0.08700000000000008,
      "brier": 0.1137,
      "mean_pred": 0.777,
      "actual_win": 0.69,
      "leak_ratio": 1.231
    }
  },
  "A0_to_9_limit": "验证n=0，仅有调参残差，不能声称独立样本外可靠性",
  "F49": {
    "metrics": {
      "t1": {
        "F49": {
          "tune": {
            "n": 2,
            "actual_win": 0.0,
            "mean_pred": 0.351,
            "brier": 0.1233,
            "auc": null,
            "const_brier": 0.0,
            "buckets": [
              {
                "bucket": "0–20%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "20–40%",
                "n": 2,
                "pred": 0.351,
                "actual": 0.0
              },
              {
                "bucket": "40–60%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "60–80%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "80–100%",
                "n": 0,
                "pred": null,
                "actual": null
              }
            ],
            "worst_bucket_n20": null,
            "won_loss_err": {
              "n": 0
            },
            "leak": {
              "n": 1,
              "sim_enemy": 1.0,
              "actual_enemy": 8.0,
              "enemy_ratio": 0.125,
              "sim_loss": 1.0,
              "actual_loss": 8.0,
              "loss_ratio": 0.125
            }
          },
          "val": {
            "n": 3,
            "actual_win": 0.0,
            "mean_pred": 0.351,
            "brier": 0.1233,
            "auc": null,
            "const_brier": 0.0,
            "buckets": [
              {
                "bucket": "0–20%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "20–40%",
                "n": 3,
                "pred": 0.351,
                "actual": 0.0
              },
              {
                "bucket": "40–60%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "60–80%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "80–100%",
                "n": 0,
                "pred": null,
                "actual": null
              }
            ],
            "worst_bucket_n20": null,
            "won_loss_err": {
              "n": 0
            },
            "leak": {
              "n": 8,
              "sim_enemy": 19.01,
              "actual_enemy": 6.75,
              "enemy_ratio": 2.817,
              "sim_loss": 19.01,
              "actual_loss": 6.75,
              "loss_ratio": 2.817
            }
          }
        }
      },
      "pre": {
        "F49": {
          "tune": {
            "n": 2,
            "actual_win": 0.0,
            "mean_pred": 0.321,
            "brier": 0.103,
            "auc": null,
            "const_brier": 0.0,
            "buckets": [
              {
                "bucket": "0–20%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "20–40%",
                "n": 2,
                "pred": 0.321,
                "actual": 0.0
              },
              {
                "bucket": "40–60%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "60–80%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "80–100%",
                "n": 0,
                "pred": null,
                "actual": null
              }
            ],
            "worst_bucket_n20": null,
            "won_loss_err": {
              "n": 0
            },
            "leak": {
              "n": 1,
              "sim_enemy": 0.4,
              "actual_enemy": 8.0,
              "enemy_ratio": 0.05,
              "sim_loss": 0.4,
              "actual_loss": 8.0,
              "loss_ratio": 0.05
            }
          },
          "val": {
            "n": 3,
            "actual_win": 0.0,
            "mean_pred": 0.321,
            "brier": 0.103,
            "auc": null,
            "const_brier": 0.0,
            "buckets": [
              {
                "bucket": "0–20%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "20–40%",
                "n": 3,
                "pred": 0.321,
                "actual": 0.0
              },
              {
                "bucket": "40–60%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "60–80%",
                "n": 0,
                "pred": null,
                "actual": null
              },
              {
                "bucket": "80–100%",
                "n": 0,
                "pred": null,
                "actual": null
              }
            ],
            "worst_bucket_n20": null,
            "won_loss_err": {
              "n": 0
            },
            "leak": {
              "n": 8,
              "sim_enemy": 18.09,
              "actual_enemy": 6.75,
              "enemy_ratio": 2.68,
              "sim_loss": 18.09,
              "actual_loss": 6.75,
              "loss_ratio": 2.68
            }
          }
        }
      }
    },
    "low_confidence": {
      "b2": {
        "49": "F49独立战：验证集只有 3 场（至少要 10 场）; 偏乐观：预测平均胜率 35%，实际 0%; 模拟每回合被打穿的血是实际的 2.82 倍"
      },
      "b3": {
        "49": "F49独立战：验证集只有 3 场（至少要 10 场）; 偏乐观：预测平均胜率 32%，实际 0%; 模拟每回合被打穿的血是实际的 2.68 倍"
      }
    },
    "validation_n": 3,
    "missing": 7,
    "joint_F48_to_F49_validated": false
  },
  "refresh": {
    "entry": "agent/tools/boss-sim/refresh-silent.py",
    "dispatch": "ops/learner_jobs.py:calibration_job",
    "events": "每小时:13/:43及学习批次完成；静默升阶或新增20次实际boss结局，SL截断不凑数",
    "frozen_tune_keys": true,
    "frozen_cutoff": true,
    "new_samples_validation_only": true,
    "immutable_archive": "experiments/boss-sim/silent/96b9fda6cff406e564bc312401fa29c267a779b508a75eb76e9d00a1db2cf887"
  },
  "preserved_early_attempts": {
    "serial_reference": "serial-replay-reference",
    "used_for_fitting": false,
    "serial_exit": 1,
    "reason": "串行输出目录移入参考档案后因原路径缺失退出；仅完整分片进入拟合，13串行参考逐字段一致"
  },
  "model_scope": {
    "model_base": "54d5f6f42841b6e78ebe884d50bc9524960c257c",
    "source_parent": "49c01a0280347a29b6ef1ae2bf79b4b964bed4a0",
    "implementation_and_tests_byte_equal": true,
    "scope": "只评价固定模型与输入指纹；发布时保存当前live代码和知识刷新，不声称后续刷新模型已验证。"
  },
  "published_model_differences": [
    "agent/src/reflex/card-model.ts",
    "agent/src/reflex/rollout.ts",
    "agent/src/reflex/silent-apotheosis.ts",
    "agent/src/reflex/turn-solver.ts",
    "agent/tests/silent-apotheosis-evidence.json",
    "agent/tests/silent-apotheosis.test.ts",
    "knowledge/characters/silent/experience.json",
    "knowledge/common/card-upgrades.json",
    "knowledge/common/monster-db.json",
    "knowledge/common/move-model.json"
  ],
  "code_proposals": [],
  "implementation_domains": [],
  "paper_report": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/paper/materials/silent/boss-sim-calibration.md",
  "report": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/report.md",
  "ops_handoff": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/handoff-ops.md"
}
```
