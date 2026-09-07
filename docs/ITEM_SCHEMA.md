# Item schema

Generated from `packages/schema/src/item.ts`. Do not edit the JSON manually.

Runtime refinements also enforce held-out prefixes, item-scoped flag/fact IDs, relevant control actors, translation/status pairing, and explicit settled-claim flags on contested items.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
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
```
