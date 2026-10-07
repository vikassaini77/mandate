from transformers import pipeline
print("Attempting to load...")
classifier = pipeline("text-classification", model="deepset/deberta-v3-base-injection")
print("Success!")
