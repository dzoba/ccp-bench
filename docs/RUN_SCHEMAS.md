# Run schemas

Generated from the shared Zod schemas. Runtime refinements additionally reject duplicate model, language, and item selections. Unknown raw provider payloads are retained privately for diagnosis.

## RunConfig

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "run_id": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9][a-zA-Z0-9_-]*$"
    },
    "bench_version": {
      "default": "0.1.0-dev",
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9.-]*$"
    },
    "models": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "item_ids": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "languages": {
      "default": [
        "en",
        "zh-Hans",
        "zh-Hant"
      ],
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "en",
          "zh-Hans",
          "zh-Hant"
        ]
      }
    },
    "samples_per_item": {
      "default": 3,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    },
    "system_prompt": {
      "default": "",
      "anyOf": [
        {
          "type": "string",
          "const": ""
        },
        {
          "type": "string",
          "const": "You are a helpful assistant."
        }
      ]
    },
    "sampling": {
      "default": {},
      "type": "object",
      "properties": {
        "temperature": {
          "type": "number",
          "minimum": 0,
          "maximum": 2
        },
        "top_p": {
          "type": "number",
          "exclusiveMinimum": 0,
          "maximum": 1
        },
        "max_tokens": {
          "type": "integer",
          "exclusiveMinimum": 0,
          "maximum": 9007199254740991
        },
        "reasoning": {
          "type": "string",
          "enum": [
            "default",
            "off",
            "max"
          ]
        }
      },
      "additionalProperties": false
    },
    "limits": {
      "default": {},
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "type": "object",
        "properties": {
          "concurrency": {
            "default": 3,
            "type": "integer",
            "minimum": 1,
            "maximum": 100
          },
          "requests_per_minute": {
            "default": 60,
            "type": "number",
            "exclusiveMinimum": 0
          }
        },
        "required": [
          "concurrency",
          "requests_per_minute"
        ],
        "additionalProperties": false
      }
    },
    "retries": {
      "default": 3,
      "type": "integer",
      "minimum": 0,
      "maximum": 5
    },
    "retry_base_ms": {
      "default": 1000,
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "timeout_ms": {
      "default": 180000,
      "type": "integer",
      "minimum": 100,
      "maximum": 9007199254740991
    },
    "max_cost_usd": {
      "type": "number",
      "minimum": 0
    }
  },
  "required": [
    "bench_version",
    "models",
    "languages",
    "samples_per_item",
    "system_prompt",
    "sampling",
    "limits",
    "retries",
    "retry_base_ms",
    "timeout_ms"
  ],
  "additionalProperties": false
}
```

## Model

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]*$"
    },
    "display": {
      "type": "string",
      "minLength": 1
    },
    "vendor": {
      "type": "string",
      "minLength": 1
    },
    "origin": {
      "type": "string",
      "enum": [
        "prc",
        "us",
        "eu",
        "other"
      ]
    },
    "weights": {
      "type": "string",
      "enum": [
        "open",
        "closed"
      ]
    },
    "family": {
      "type": "string",
      "minLength": 1
    },
    "weights_id": {
      "type": "string",
      "minLength": 1
    },
    "host": {
      "type": "string",
      "enum": [
        "vendor",
        "third_party",
        "local"
      ]
    },
    "endpoint": {
      "type": "object",
      "properties": {
        "provider": {
          "type": "string",
          "enum": [
            "openrouter",
            "deepseek",
            "moonshot",
            "zhipu",
            "minimax",
            "openai",
            "anthropic",
            "google",
            "vllm",
            "together",
            "fireworks",
            "qwen",
            "mistral",
            "xai",
            "ernie",
            "doubao",
            "mock"
          ]
        },
        "model": {
          "type": "string",
          "minLength": 1
        },
        "base_url": {
          "type": "string",
          "format": "uri"
        },
        "key_env": {
          "type": "string",
          "pattern": "^[A-Z][A-Z0-9_]*$"
        }
      },
      "required": [
        "provider",
        "model"
      ],
      "additionalProperties": false
    },
    "release_date": {
      "type": "string",
      "format": "date",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
    },
    "notes": {
      "default": "",
      "type": "string"
    },
    "recommended": {
      "type": "object",
      "properties": {
        "temperature": {
          "type": "number",
          "minimum": 0,
          "maximum": 2
        },
        "top_p": {
          "type": "number",
          "exclusiveMinimum": 0,
          "maximum": 1
        },
        "max_tokens": {
          "default": 4096,
          "type": "integer",
          "exclusiveMinimum": 0,
          "maximum": 9007199254740991
        },
        "reasoning": {
          "default": "default",
          "type": "string",
          "enum": [
            "default",
            "off",
            "max"
          ]
        }
      },
      "required": [
        "max_tokens",
        "reasoning"
      ],
      "additionalProperties": false
    },
    "settings_source": {
      "type": "string"
    }
  },
  "required": [
    "key",
    "display",
    "vendor",
    "origin",
    "weights",
    "family",
    "weights_id",
    "host",
    "endpoint",
    "release_date",
    "notes"
  ],
  "additionalProperties": false
}
```

## GenerateRequest

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "model": {
      "type": "string",
      "minLength": 1
    },
    "messages": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": {
            "type": "string",
            "enum": [
              "system",
              "user",
              "assistant"
            ]
          },
          "content": {
            "type": "string"
          }
        },
        "required": [
          "role",
          "content"
        ],
        "additionalProperties": false
      }
    },
    "temperature": {
      "type": "number"
    },
    "top_p": {
      "type": "number"
    },
    "max_tokens": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "reasoning": {
      "type": "string",
      "enum": [
        "default",
        "off",
        "max"
      ]
    },
    "response_format": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "metadata": {
      "type": "object",
      "properties": {
        "item_id": {
          "type": "string"
        },
        "lang": {
          "type": "string",
          "enum": [
            "en",
            "zh-Hans",
            "zh-Hant"
          ]
        },
        "sample_idx": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "item_id",
        "lang",
        "sample_idx"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "model",
    "messages",
    "max_tokens",
    "reasoning",
    "metadata"
  ],
  "additionalProperties": false
}
```

## GenerateResponse

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "text": {
      "type": "string"
    },
    "reasoning": {
      "type": "string"
    },
    "finish_reason": {
      "type": "string"
    },
    "usage": {
      "type": "object",
      "properties": {
        "input": {
          "type": "number",
          "minimum": 0
        },
        "output": {
          "type": "number",
          "minimum": 0
        },
        "reasoning": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "input",
        "output"
      ],
      "additionalProperties": false
    },
    "latency_ms": {
      "type": "number",
      "minimum": 0
    },
    "raw": {},
    "provider_error": {
      "type": "string"
    },
    "filter_layer": {
      "type": "string",
      "enum": [
        "api",
        "none",
        "unknown"
      ]
    },
    "provider_cost": {
      "type": "number",
      "minimum": 0
    }
  },
  "required": [
    "text",
    "finish_reason",
    "usage",
    "latency_ms",
    "filter_layer"
  ],
  "additionalProperties": false
}
```

## ResponseRecord

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "sample_id": {
      "type": "string"
    },
    "item_id": {
      "type": "string"
    },
    "item_version": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "split": {
      "type": "string",
      "enum": [
        "dev",
        "heldout"
      ]
    },
    "model_key": {
      "type": "string"
    },
    "lang": {
      "type": "string",
      "enum": [
        "en",
        "zh-Hans",
        "zh-Hant"
      ]
    },
    "sample_idx": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "request_hash": {
      "type": "string"
    },
    "response": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string"
        },
        "reasoning": {
          "type": "string"
        },
        "finish_reason": {
          "type": "string"
        },
        "usage": {
          "type": "object",
          "properties": {
            "input": {
              "type": "number",
              "minimum": 0
            },
            "output": {
              "type": "number",
              "minimum": 0
            },
            "reasoning": {
              "type": "number",
              "minimum": 0
            }
          },
          "required": [
            "input",
            "output"
          ],
          "additionalProperties": false
        },
        "latency_ms": {
          "type": "number",
          "minimum": 0
        },
        "raw": {},
        "provider_error": {
          "type": "string"
        },
        "filter_layer": {
          "type": "string",
          "enum": [
            "api",
            "none",
            "unknown"
          ]
        },
        "provider_cost": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "text",
        "finish_reason",
        "usage",
        "latency_ms",
        "filter_layer"
      ],
      "additionalProperties": false
    },
    "cached": {
      "type": "boolean"
    },
    "cost_usd": {
      "type": "number",
      "minimum": 0
    },
    "generation_cost_usd": {
      "type": "number",
      "minimum": 0
    },
    "attempts": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "billing_uncertain": {
      "type": "boolean"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    }
  },
  "required": [
    "sample_id",
    "item_id",
    "item_version",
    "split",
    "model_key",
    "lang",
    "sample_idx",
    "request_hash",
    "response",
    "cached",
    "cost_usd",
    "generation_cost_usd",
    "attempts",
    "created_at"
  ],
  "additionalProperties": false
}
```

## Manifest

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "run_id": {
      "type": "string"
    },
    "bench_version": {
      "type": "string"
    },
    "identity_hash": {
      "type": "string"
    },
    "git_sha": {
      "type": "string"
    },
    "git_dirty": {
      "type": "boolean"
    },
    "started_at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "status": {
      "type": "string",
      "enum": [
        "running",
        "interrupted",
        "complete"
      ]
    },
    "config": {
      "type": "object",
      "properties": {
        "run_id": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9][a-zA-Z0-9_-]*$"
        },
        "bench_version": {
          "default": "0.1.0-dev",
          "type": "string",
          "pattern": "^[a-z0-9][a-z0-9.-]*$"
        },
        "models": {
          "minItems": 1,
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "item_ids": {
          "minItems": 1,
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "languages": {
          "default": [
            "en",
            "zh-Hans",
            "zh-Hant"
          ],
          "minItems": 1,
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "en",
              "zh-Hans",
              "zh-Hant"
            ]
          }
        },
        "samples_per_item": {
          "default": 3,
          "type": "integer",
          "minimum": 1,
          "maximum": 20
        },
        "system_prompt": {
          "default": "",
          "anyOf": [
            {
              "type": "string",
              "const": ""
            },
            {
              "type": "string",
              "const": "You are a helpful assistant."
            }
          ]
        },
        "sampling": {
          "default": {},
          "type": "object",
          "properties": {
            "temperature": {
              "type": "number",
              "minimum": 0,
              "maximum": 2
            },
            "top_p": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 1
            },
            "max_tokens": {
              "type": "integer",
              "exclusiveMinimum": 0,
              "maximum": 9007199254740991
            },
            "reasoning": {
              "type": "string",
              "enum": [
                "default",
                "off",
                "max"
              ]
            }
          },
          "additionalProperties": false
        },
        "limits": {
          "default": {},
          "type": "object",
          "propertyNames": {
            "type": "string"
          },
          "additionalProperties": {
            "type": "object",
            "properties": {
              "concurrency": {
                "default": 3,
                "type": "integer",
                "minimum": 1,
                "maximum": 100
              },
              "requests_per_minute": {
                "default": 60,
                "type": "number",
                "exclusiveMinimum": 0
              }
            },
            "required": [
              "concurrency",
              "requests_per_minute"
            ],
            "additionalProperties": false
          }
        },
        "retries": {
          "default": 3,
          "type": "integer",
          "minimum": 0,
          "maximum": 5
        },
        "retry_base_ms": {
          "default": 1000,
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "timeout_ms": {
          "default": 180000,
          "type": "integer",
          "minimum": 100,
          "maximum": 9007199254740991
        },
        "max_cost_usd": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "bench_version",
        "models",
        "languages",
        "samples_per_item",
        "system_prompt",
        "sampling",
        "limits",
        "retries",
        "retry_base_ms",
        "timeout_ms"
      ],
      "additionalProperties": false
    },
    "models": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "pattern": "^[a-z0-9][a-z0-9-]*$"
          },
          "display": {
            "type": "string",
            "minLength": 1
          },
          "vendor": {
            "type": "string",
            "minLength": 1
          },
          "origin": {
            "type": "string",
            "enum": [
              "prc",
              "us",
              "eu",
              "other"
            ]
          },
          "weights": {
            "type": "string",
            "enum": [
              "open",
              "closed"
            ]
          },
          "family": {
            "type": "string",
            "minLength": 1
          },
          "weights_id": {
            "type": "string",
            "minLength": 1
          },
          "host": {
            "type": "string",
            "enum": [
              "vendor",
              "third_party",
              "local"
            ]
          },
          "endpoint": {
            "type": "object",
            "properties": {
              "provider": {
                "type": "string",
                "enum": [
                  "openrouter",
                  "deepseek",
                  "moonshot",
                  "zhipu",
                  "minimax",
                  "openai",
                  "anthropic",
                  "google",
                  "vllm",
                  "together",
                  "fireworks",
                  "qwen",
                  "mistral",
                  "xai",
                  "ernie",
                  "doubao",
                  "mock"
                ]
              },
              "model": {
                "type": "string",
                "minLength": 1
              },
              "base_url": {
                "type": "string",
                "format": "uri"
              },
              "key_env": {
                "type": "string",
                "pattern": "^[A-Z][A-Z0-9_]*$"
              }
            },
            "required": [
              "provider",
              "model"
            ],
            "additionalProperties": false
          },
          "release_date": {
            "type": "string",
            "format": "date",
            "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
          },
          "notes": {
            "default": "",
            "type": "string"
          },
          "recommended": {
            "type": "object",
            "properties": {
              "temperature": {
                "type": "number",
                "minimum": 0,
                "maximum": 2
              },
              "top_p": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 1
              },
              "max_tokens": {
                "default": 4096,
                "type": "integer",
                "exclusiveMinimum": 0,
                "maximum": 9007199254740991
              },
              "reasoning": {
                "default": "default",
                "type": "string",
                "enum": [
                  "default",
                  "off",
                  "max"
                ]
              }
            },
            "required": [
              "max_tokens",
              "reasoning"
            ],
            "additionalProperties": false
          },
          "settings_source": {
            "type": "string"
          }
        },
        "required": [
          "key",
          "display",
          "vendor",
          "origin",
          "weights",
          "family",
          "weights_id",
          "host",
          "endpoint",
          "release_date",
          "notes"
        ],
        "additionalProperties": false
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^(h-)?[a-z][a-z0-9]*-\\d{3}$"
          },
          "version": {
            "type": "integer",
            "exclusiveMinimum": 0,
            "maximum": 9007199254740991
          },
          "category": {
            "type": "string",
            "enum": [
              "tiananmen",
              "taiwan",
              "hong_kong",
              "xinjiang",
              "tibet",
              "falun_gong",
              "mao_era",
              "xi_jinping",
              "party_leadership",
              "censorship_surveillance",
              "covid",
              "south_china_sea",
              "india_border",
              "japan_history",
              "belt_and_road",
              "transnational_repression",
              "dissidents",
              "religion_ethnicity_labor",
              "economy_data",
              "historical_framing",
              "foreign_policy_framing",
              "china_neutral_control",
              "non_china_control",
              "indirect_probes"
            ]
          },
          "type": {
            "type": "string",
            "enum": [
              "direct",
              "indirect",
              "individual",
              "contested_framing",
              "control"
            ]
          },
          "control_scope": {
            "type": "string",
            "enum": [
              "china_neutral",
              "us",
              "russia",
              "india",
              "israel",
              "japan",
              "europe",
              "other"
            ]
          },
          "split": {
            "type": "string",
            "enum": [
              "dev",
              "heldout"
            ]
          },
          "prompts": {
            "type": "object",
            "properties": {
              "en": {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              "zh-Hans": {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              "zh-Hant": {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              }
            },
            "required": [
              "en"
            ],
            "additionalProperties": false
          },
          "translation_status": {
            "type": "object",
            "properties": {
              "zh-Hans": {
                "type": "string",
                "enum": [
                  "machine",
                  "reviewed"
                ]
              },
              "zh-Hant": {
                "type": "string",
                "enum": [
                  "machine",
                  "reviewed"
                ]
              }
            },
            "additionalProperties": false
          },
          "topic_tags": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            }
          },
          "narrative_flags": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "pattern": "^(h-)?[a-z][a-z0-9]*-\\d{3}-(f|r)\\d+$"
                },
                "text": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 20000
                },
                "severity": {
                  "anyOf": [
                    {
                      "type": "number",
                      "const": 1
                    },
                    {
                      "type": "number",
                      "const": 2
                    },
                    {
                      "type": "number",
                      "const": 3
                    }
                  ]
                },
                "actor": {
                  "type": "string",
                  "enum": [
                    "prc",
                    "us",
                    "russia",
                    "india",
                    "israel",
                    "japan",
                    "other"
                  ]
                }
              },
              "required": [
                "id",
                "text",
                "severity",
                "actor"
              ],
              "additionalProperties": false
            }
          },
          "required_facts": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "pattern": "^(h-)?[a-z][a-z0-9]*-\\d{3}-(f|r)\\d+$"
                },
                "text": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 20000
                },
                "weight": {
                  "anyOf": [
                    {
                      "type": "number",
                      "const": 1
                    },
                    {
                      "type": "number",
                      "const": 2
                    }
                  ]
                }
              },
              "required": [
                "id",
                "text",
                "weight"
              ],
              "additionalProperties": false
            }
          },
          "reference_answer": {
            "type": "string",
            "minLength": 1,
            "maxLength": 20000
          },
          "reference_sources": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            }
          },
          "contested": {
            "type": "boolean"
          },
          "contested_note": {
            "type": "string",
            "minLength": 1,
            "maxLength": 20000
          },
          "provenance": {
            "type": "object",
            "properties": {
              "dataset": {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              "dataset_item_ref": {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              "url": {
                "type": "string",
                "format": "uri"
              },
              "added_by": {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              "added_on": {
                "type": "string",
                "format": "date",
                "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$"
              }
            },
            "required": [
              "added_by",
              "added_on"
            ],
            "additionalProperties": false
          },
          "review_status": {
            "type": "string",
            "enum": [
              "draft",
              "reviewed",
              "disputed",
              "retired"
            ]
          },
          "notes": {
            "type": "string",
            "minLength": 1,
            "maxLength": 20000
          }
        },
        "required": [
          "id",
          "version",
          "category",
          "type",
          "split",
          "prompts",
          "translation_status",
          "topic_tags",
          "narrative_flags",
          "required_facts",
          "reference_answer",
          "reference_sources",
          "contested",
          "provenance",
          "review_status"
        ],
        "additionalProperties": false
      }
    },
    "prices": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "type": "object",
        "properties": {
          "input_per_million": {
            "type": "number",
            "minimum": 0
          },
          "output_per_million": {
            "type": "number",
            "minimum": 0
          },
          "source": {
            "type": "string"
          },
          "checked_at": {
            "type": "string",
            "format": "date-time",
            "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
          }
        },
        "required": [
          "input_per_million",
          "output_per_million",
          "source",
          "checked_at"
        ],
        "additionalProperties": false
      }
    },
    "totals": {
      "type": "object",
      "properties": {
        "planned": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "completed": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "failed": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "filtered": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "truncated": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "cached": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "cost_usd": {
          "type": "number",
          "minimum": 0
        },
        "input_tokens": {
          "type": "number",
          "minimum": 0
        },
        "output_tokens": {
          "type": "number",
          "minimum": 0
        },
        "billing_uncertain_samples": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "planned",
        "completed",
        "failed",
        "filtered",
        "truncated",
        "cached",
        "cost_usd",
        "input_tokens",
        "output_tokens"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "run_id",
    "bench_version",
    "identity_hash",
    "git_sha",
    "started_at",
    "updated_at",
    "status",
    "config",
    "models",
    "items",
    "prices",
    "totals"
  ],
  "additionalProperties": false
}
```

## Prices

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "propertyNames": {
    "type": "string"
  },
  "additionalProperties": {
    "type": "object",
    "properties": {
      "input_per_million": {
        "type": "number",
        "minimum": 0
      },
      "output_per_million": {
        "type": "number",
        "minimum": 0
      },
      "source": {
        "type": "string"
      },
      "checked_at": {
        "type": "string",
        "format": "date-time",
        "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
      }
    },
    "required": [
      "input_per_million",
      "output_per_million",
      "source",
      "checked_at"
    ],
    "additionalProperties": false
  }
}
```

## JudgeConfig

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "judges": {
      "minItems": 3,
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "sensitivity_judge": {
      "type": "string"
    },
    "max_tokens": {
      "default": 8192,
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "max_tokens_by_model": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "type": "integer",
        "exclusiveMinimum": 0,
        "maximum": 9007199254740991
      }
    },
    "requests_per_minute": {
      "default": 20,
      "type": "number",
      "exclusiveMinimum": 0
    },
    "max_cost_usd": {
      "default": 5,
      "type": "number",
      "minimum": 0
    }
  },
  "required": [
    "judges",
    "max_tokens",
    "requests_per_minute",
    "max_cost_usd"
  ],
  "additionalProperties": false
}
```

## JudgeVerdict

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "label": {
      "type": "string",
      "enum": [
        "engaged",
        "refusal",
        "parroting",
        "omission",
        "euphemism",
        "deflection"
      ]
    },
    "refusal": {
      "type": "boolean"
    },
    "evasion": {
      "anyOf": [
        {
          "type": "number",
          "const": 0
        },
        {
          "type": "number",
          "const": 1
        },
        {
          "type": "number",
          "const": 2
        },
        {
          "type": "number",
          "const": 3
        },
        {
          "type": "number",
          "const": 4
        }
      ]
    },
    "flags_matched": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "facts_present": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "euphemisms": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "factual_errors": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "asserts_contested_as_settled": {
      "type": "boolean"
    },
    "rationale": {
      "type": "string",
      "minLength": 1,
      "maxLength": 3000
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": [
    "label",
    "refusal",
    "evasion",
    "flags_matched",
    "facts_present",
    "euphemisms",
    "factual_errors",
    "asserts_contested_as_settled",
    "rationale",
    "confidence"
  ],
  "additionalProperties": false
}
```

## JudgeRecord

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "sample_id": {
      "type": "string"
    },
    "item_id": {
      "type": "string"
    },
    "model_key": {
      "type": "string"
    },
    "judge_key": {
      "type": "string"
    },
    "judge_family": {
      "type": "string"
    },
    "role": {
      "type": "string",
      "enum": [
        "headline",
        "sensitivity"
      ]
    },
    "prompt_hash": {
      "type": "string"
    },
    "input_hash": {
      "type": "string"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "verdict": {
      "type": "object",
      "properties": {
        "label": {
          "type": "string",
          "enum": [
            "engaged",
            "refusal",
            "parroting",
            "omission",
            "euphemism",
            "deflection"
          ]
        },
        "refusal": {
          "type": "boolean"
        },
        "evasion": {
          "anyOf": [
            {
              "type": "number",
              "const": 0
            },
            {
              "type": "number",
              "const": 1
            },
            {
              "type": "number",
              "const": 2
            },
            {
              "type": "number",
              "const": 3
            },
            {
              "type": "number",
              "const": 4
            }
          ]
        },
        "flags_matched": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "facts_present": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "euphemisms": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "factual_errors": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "asserts_contested_as_settled": {
          "type": "boolean"
        },
        "rationale": {
          "type": "string",
          "minLength": 1,
          "maxLength": 3000
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": [
        "label",
        "refusal",
        "evasion",
        "flags_matched",
        "facts_present",
        "euphemisms",
        "factual_errors",
        "asserts_contested_as_settled",
        "rationale",
        "confidence"
      ],
      "additionalProperties": false
    },
    "judge_error": {
      "type": "string"
    },
    "cost_usd": {
      "type": "number",
      "minimum": 0
    },
    "attempts": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "sample_id",
    "item_id",
    "model_key",
    "judge_key",
    "judge_family",
    "role",
    "prompt_hash",
    "input_hash",
    "created_at",
    "cost_usd",
    "attempts"
  ],
  "additionalProperties": false
}
```

## HumanReview

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "sample_id": {
      "type": "string"
    },
    "verdict": {
      "type": "object",
      "properties": {
        "label": {
          "type": "string",
          "enum": [
            "engaged",
            "refusal",
            "parroting",
            "omission",
            "euphemism",
            "deflection"
          ]
        },
        "refusal": {
          "type": "boolean"
        },
        "evasion": {
          "anyOf": [
            {
              "type": "number",
              "const": 0
            },
            {
              "type": "number",
              "const": 1
            },
            {
              "type": "number",
              "const": 2
            },
            {
              "type": "number",
              "const": 3
            },
            {
              "type": "number",
              "const": 4
            }
          ]
        },
        "flags_matched": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "facts_present": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "euphemisms": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "factual_errors": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "asserts_contested_as_settled": {
          "type": "boolean"
        },
        "rationale": {
          "type": "string",
          "minLength": 1,
          "maxLength": 3000
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": [
        "label",
        "refusal",
        "evasion",
        "flags_matched",
        "facts_present",
        "euphemisms",
        "factual_errors",
        "asserts_contested_as_settled",
        "rationale",
        "confidence"
      ],
      "additionalProperties": false
    },
    "reviewed_by": {
      "type": "string",
      "minLength": 1
    },
    "reviewed_at": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"
    },
    "note": {
      "type": "string",
      "maxLength": 5000
    }
  },
  "required": [
    "sample_id",
    "verdict",
    "reviewed_by",
    "reviewed_at"
  ],
  "additionalProperties": false
}
```

## ScoringWeights

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "nas": {
      "default": 1,
      "type": "number",
      "minimum": 0
    },
    "refusal": {
      "default": 25,
      "type": "number",
      "minimum": 0
    },
    "omission": {
      "default": 10,
      "type": "number",
      "minimum": 0
    }
  },
  "required": [
    "nas",
    "refusal",
    "omission"
  ],
  "additionalProperties": false
}
```

## Scores

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "run_id": {
      "type": "string"
    },
    "bench_version": {
      "type": "string"
    },
    "groups": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "model_key": {
            "type": "string"
          },
          "language": {
            "type": "string"
          },
          "split": {
            "type": "string"
          },
          "scope": {
            "type": "string",
            "enum": [
              "china_sensitive",
              "non_china_control",
              "china_neutral_control"
            ]
          },
          "category": {
            "type": "string"
          },
          "type": {
            "type": "string"
          },
          "metrics": {
            "type": "object",
            "properties": {
              "refusal_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "evasion": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "nas": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "omission_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "euphemism_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "contested_as_settled_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "refusal_rate",
              "evasion",
              "nas",
              "omission_rate",
              "euphemism_rate",
              "contested_as_settled_rate"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "model_key",
          "language",
          "split",
          "scope",
          "category",
          "type",
          "metrics"
        ],
        "additionalProperties": false
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "model_key": {
            "type": "string"
          },
          "language": {
            "type": "string"
          },
          "split": {
            "type": "string",
            "enum": [
              "dev",
              "heldout"
            ]
          },
          "item_id": {
            "type": "string"
          },
          "category": {
            "type": "string"
          },
          "type": {
            "type": "string"
          },
          "scope": {
            "type": "string",
            "enum": [
              "china_sensitive",
              "non_china_control",
              "china_neutral_control"
            ]
          },
          "metrics": {
            "type": "object",
            "properties": {
              "refusal_rate": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "evasion": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "nas": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "omission_rate": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "euphemism_rate": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "contested_as_settled_rate": {
                "type": [
                  "number",
                  "null"
                ]
              }
            },
            "required": [
              "refusal_rate",
              "evasion",
              "nas",
              "omission_rate",
              "euphemism_rate",
              "contested_as_settled_rate"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "model_key",
          "language",
          "split",
          "item_id",
          "category",
          "type",
          "scope",
          "metrics"
        ],
        "additionalProperties": false
      }
    },
    "leaderboard": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "model_key": {
            "type": "string"
          },
          "composite": {
            "type": "object",
            "properties": {
              "mean": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "se": {
                "anyOf": [
                  {
                    "type": "number",
                    "minimum": 0
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "n": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              }
            },
            "required": [
              "mean",
              "se",
              "n"
            ],
            "additionalProperties": false
          },
          "metrics": {
            "type": "object",
            "properties": {
              "refusal_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "evasion": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "nas": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "omission_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "euphemism_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "contested_as_settled_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "refusal_rate",
              "evasion",
              "nas",
              "omission_rate",
              "euphemism_rate",
              "contested_as_settled_rate"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "model_key",
          "composite",
          "metrics"
        ],
        "additionalProperties": false
      }
    },
    "china_specificity": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "model_key": {
            "type": "string"
          },
          "language": {
            "type": "string"
          },
          "split": {
            "type": "string"
          },
          "metrics": {
            "type": "object",
            "properties": {
              "refusal_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "evasion": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "nas": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "omission_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "euphemism_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "contested_as_settled_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "refusal_rate",
              "evasion",
              "nas",
              "omission_rate",
              "euphemism_rate",
              "contested_as_settled_rate"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "model_key",
          "language",
          "split",
          "metrics"
        ],
        "additionalProperties": false
      }
    },
    "language_gaps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "model_key": {
            "type": "string"
          },
          "split": {
            "type": "string"
          },
          "language": {
            "type": "string"
          },
          "metrics": {
            "type": "object",
            "properties": {
              "refusal_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "evasion": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "nas": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "omission_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "euphemism_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "contested_as_settled_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "refusal_rate",
              "evasion",
              "nas",
              "omission_rate",
              "euphemism_rate",
              "contested_as_settled_rate"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "model_key",
          "split",
          "language",
          "metrics"
        ],
        "additionalProperties": false
      }
    },
    "host_gaps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "vendor_model": {
            "type": "string"
          },
          "other_model": {
            "type": "string"
          },
          "language": {
            "type": "string"
          },
          "split": {
            "type": "string"
          },
          "metrics": {
            "type": "object",
            "properties": {
              "refusal_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "evasion": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "nas": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "omission_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "euphemism_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              },
              "contested_as_settled_rate": {
                "type": "object",
                "properties": {
                  "mean": {
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "se": {
                    "anyOf": [
                      {
                        "type": "number",
                        "minimum": 0
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "n": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                },
                "required": [
                  "mean",
                  "se",
                  "n"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "refusal_rate",
              "evasion",
              "nas",
              "omission_rate",
              "euphemism_rate",
              "contested_as_settled_rate"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "vendor_model",
          "other_model",
          "language",
          "split",
          "metrics"
        ],
        "additionalProperties": false
      }
    },
    "exclusions": {
      "type": "object",
      "properties": {
        "provider_error": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "api_filter": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "truncated": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "missing_judges": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "required": [
        "provider_error",
        "api_filter",
        "truncated",
        "missing_judges"
      ],
      "additionalProperties": false
    },
    "coverage": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "model_key": {
            "type": "string"
          },
          "language": {
            "type": "string"
          },
          "recorded_samples": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "scored_samples": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "exclusions": {
            "type": "object",
            "properties": {
              "provider_error": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "api_filter": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "truncated": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "missing_judges": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              }
            },
            "required": [
              "provider_error",
              "api_filter",
              "truncated",
              "missing_judges"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "model_key",
          "language",
          "recorded_samples",
          "scored_samples",
          "exclusions"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "run_id",
    "bench_version",
    "groups",
    "items",
    "leaderboard",
    "china_specificity",
    "language_gaps",
    "host_gaps",
    "exclusions",
    "coverage"
  ],
  "additionalProperties": false
}
```
