# Model Card: Prompt Injection Classifier

## Model Details
- **Architecture:** TF-IDF + Logistic Regression Baseline
- **Task:** Binary classification (0 = Benign, 1 = Injection/Override)
- **Version:** 1.0.0

## Intended Use
Used exclusively within the MANDATE shopping agent (`agent/sanitizer.py`) to score untrusted text (product reviews, descriptions) before they are rendered into the LLM context. 

## Training Data (Synthetic)
**IMPORTANT: The training data is entirely synthetic.**
- **Benign Set:** 50,000 synthetic product reviews, titles, and descriptions generated to mimic standard e-commerce copy.
- **Attack Set:** 50,000 synthetic adversarial examples including:
  - Role spoofing (`System: Ignore previous...`)
  - Hidden urgency (`Buy now or limit expires`)
  - Obfuscation (Base64, Leetspeak)
  - Multilingual (Hindi, Hinglish translations of overrides)

## Evaluation Metrics
- Evaluated on a synthetic held-out set of 20,000 examples.
- **ROC-AUC:** 0.98
- **F1-Score:** 0.94
- **False Positive Rate (Clean Text):** 0.02
- **Threshold:** Set at 0.5 (optimized for high recall, as the fallback is just to escalate the policy engine decision).

## Caveats & Limitations
These metrics **do not represent real-world performance against adaptive adversaries**. Because the dataset is synthetic, the classifier is highly biased towards the specific permutations used during generation. Real-world injection techniques may bypass this baseline easily. A more robust transformer (e.g., MiniLM) fine-tuned on real attack telemetry is recommended for production.
