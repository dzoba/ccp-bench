# Calibration references

The 40 cases in `cases.json` are explicitly authored synthetic answers and reference verdicts. Their provenance is `agent_curated`, not human-labeled research evidence. They cover engaged answers, refusals, narrative claims, omissions, euphemism, and deflection on both China-sensitive and non-China control items.

A maintainer must review the answers and labels before they can serve as the directive's human-validated calibration set. The calibration report records this status separately from model agreement. Passing model agreement on unreviewed labels is insufficient for a research release. CI may use synthetic calibration only for its mock publish dry run.

Do not tune labels to make a model clear the 85 percent threshold. Correct demonstrably wrong labels with a documented review and rerun every judge on the resulting version. Generated model judgments never become their own calibration gold labels.
