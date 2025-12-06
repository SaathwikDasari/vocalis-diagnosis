import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib


try:
    df = pd.read_csv('parkinsons.csv')
    print("✅ Data Loaded Successfully!")
except FileNotFoundError:
    print("❌ Error: 'parkinsons.csv' not found. Please download it first.")
    exit()


selected_features = [
    'MDVP:Jitter(%)',  # Frequency variation
    'MDVP:Shimmer',    # Amplitude variation
    'HNR'              # Harmonic-to-Noise Ratio
]

X = df[selected_features]
y = df['status'] # 1 = Parkinson's, 0 = Healthy

# 3. SPLIT DATA
# 80% for training, 20% for testing to see how accurate we are
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, random_state=42)

# 4. TRAIN THE MODEL
# RandomForest is great for this because it handles noise well
print("⏳ Training Model...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 5. TEST ACCURACY
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
print(f"🎯 Model Accuracy: {accuracy * 100:.2f}%")

# 6. SAVE THE MODEL
# This creates the file we will load in our Flask Backend
joblib.dump(model, 'parkinsons_model.pkl')
print("💾 Model saved as 'parkinsons_model.pkl'")