from packages.ml.manager import MLManager

MLManager.load_models()

anomaly = MLManager._models['anomaly']

f1 = {'amount': 50, 'hour_of_day': 14, 'category_novelty': 0.0, 'merchant_novelty': 0.0, 'velocity_1h': 1, 'velocity_24h': 1}
f2 = {'amount': 4500, 'hour_of_day': 3, 'category_novelty': 1.0, 'merchant_novelty': 1.0, 'velocity_1h': 20, 'velocity_24h': 20}

print("Normal:", anomaly.predict_proba(f1))
print("Hacker:", anomaly.predict_proba(f2))
