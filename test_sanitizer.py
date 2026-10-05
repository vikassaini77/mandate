import json
from packages.ml.manager import MLManager
MLManager.load_models()
body = {
  "merchant": "Notion",
  "amount": 325.0,
  "rule_id": "MND-CAT-003",
  "reasoning": "The request conflicts with a hard mandate boundary. Policy precedence prevents the agent from overriding this rule."
}
text_body = json.dumps(body)
from packages.ai.sanitizer import DataSanitizer
score = DataSanitizer.score_risk(text_body)
print(f"Risk Score: {score}")
