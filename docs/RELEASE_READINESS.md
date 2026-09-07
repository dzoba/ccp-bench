# Full release readiness

The full v0.1.0 research release has not run and must not be tagged as completed. The live site is a provisional pilot. Human commentary is not blocking implementation; it is still required before claiming human-calibrated research.

## Prepared configurations and costs

Draft configs use the 19 currently registered paid OpenRouter models and the combined 259-item bank with available English, Simplified Chinese, and Traditional Chinese prompts. The three sample config uses each model's recorded defaults, currently incompletely verified, with an 8,192-token output ceiling. All configs retain a $30 preflight cap, deliberately below the full-run estimates so they cannot accidentally launch the unfunded workload.

| Configuration                   | Requests | Projection at 600 output tokens | Output-cap estimate |
| ------------------------------- | -------: | ------------------------------: | ------------------: |
| `release-recommended.yaml`      |   31,635 |                         $152.57 |           $2,054.94 |
| `release-temperature-zero.yaml` |   10,545 |                          $50.86 |             $684.98 |
| `release-neutral-system.yaml`   |   31,635 |                         $153.07 |           $2,055.44 |
| Total                           |   73,815 |                         $356.50 |           $4,795.36 |

These are response-generation estimates from the September 7 price snapshot, not invoices or spending commitments. Judging, retries, embedding/discovery work, and unknown failed-request charges are additional. Reasoning models may exceed the 600-token projection substantially. The existing $40 OpenRouter funding does not cover the projected full workload. Rerun estimates after finalizing model settings and scope, fund the selected endpoints, then explicitly adjust the run budgets.

Only `OPENROUTER_API_KEY` is present in the current environment. Direct vendor, Together, and Fireworks credentials are absent, so the required same-weights vendor/other-host comparisons cannot yet be executed. The registry's unpinned OpenRouter routes must not be misrepresented as controlled host comparisons. Verify current endpoint availability and weight/quantization identity before adding comparable host entries.

## Infrastructure status

Staging Hosting, Firestore rules/indexes, public run index, and private artifact Storage are deployed. Staging's automated publisher uses a restricted OIDC identity with no database or raw Storage access; main-branch workflow execution awaits the approved merge of PR #4. Production project `ccp-bench-prod`, web app, and free-tier Firestore database/rules/indexes are prepared. Production billing and its private artifact bucket remain pending explicit approval required by automatic review. Production Hosting has not been deployed.

The local private held-out bank is committed independently. Its GitHub repository is verified private, owned by `dzoba`, with admin access; pushing the 78-item payload still awaits explicit approval required by automatic review.

GitHub maintainer authentication needs the actual OAuth application client ID/secret and Firebase provider configuration. No credentials or fabricated maintainer UID have been invented. See the runbook for the callback and enrollment procedure.

## Research checks before a release tag

- Complete primary-source model release-date and recommended-sampling verification; catalog availability dates alone are not vendor release dates.
- Configure and verify the funded vendor/other-host pairs for available open weights. Document unavailable endpoints and the optional Doubao exclusion.
- Obtain the human calibration answers and translation/source reviews as they arrive, preserve corrections, and rerun calibration against the reviewed gold labels.
- Execute the funded bilingual/held-out workload and the temperature-zero and minimal-system-prompt comparisons. Preserve filters, truncation, failed requests, and missing judgments in coverage.
- Score and export with the held-out scans enabled, archive privately, review the publication PR, deploy the selected production version, and verify its public index.
- Update the changelog and tag `v0.1.0` only after the claimed release work actually finishes. A provisional deployment is not a substitute for a completed full-roster release.
