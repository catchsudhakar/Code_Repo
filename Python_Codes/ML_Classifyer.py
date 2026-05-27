import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import numpy as np

# Load the dataset
df = pd.read_csv('customer_messages.csv')

# Split into pre-drift (training) and post-drift (testing)
train_data = df[df['time_period'] == 'pre_drift'].copy()
test_data = df[df['time_period'] == 'post_drift'].copy()

print("="*70)
print("STEP 1: BASELINE MODEL - Train on pre-drift, Test on pre-drift (holdout)")
print("="*70)

# Split pre-drift  80% train, 20% holdout test (both pre-drift)
train_split, holdout_test = train_test_split(
    train_data, test_size=0.2, random_state=42, stratify=train_data['label']
)

print(f"\nTraining set size: {len(train_split)}")
print(f"Holdout test set size: {len(holdout_test)}")
print(f"Drift test set size: {len(test_data)}")

# Create TF-IDF vectorizer and model
vectorizer = TfidfVectorizer(max_features=100, ngram_range=(1, 2))
model = LogisticRegression(random_state=42, max_iter=1000)

# Fit vectorizer and model on training data
X_train = vectorizer.fit_transform(train_split['message'])
y_train = train_split['label']

model.fit(X_train, y_train)

# Test on holdout (pre-drift) - this is baseline performance
X_holdout = vectorizer.transform(holdout_test['message'])
y_holdout = holdout_test['label']
y_holdout_pred = model.predict(X_holdout)

baseline_accuracy = accuracy_score(y_holdout, y_holdout_pred)
print(f"\n✓ Baseline accuracy (on pre-drift holdout): {baseline_accuracy:.2%}")
print(f"\nClassification report (pre-drift holdout):")
print(classification_report(y_holdout, y_holdout_pred))

print("\n" + "="*70)
print("STEP 2: TEST ON POST-DRIFT DATA - This is where drift shows up!")
print("="*70)

# Test on post-drift data (WITHOUT retraining)
X_drift = vectorizer.transform(test_data['message'])
y_drift = test_data['label']
y_drift_pred = model.predict(X_drift)

drift_accuracy = accuracy_score(y_drift, y_drift_pred)
print(f"\n✓ Accuracy on post-drift  {drift_accuracy:.2%}")

# Calculate performance drop
performance_drop = baseline_accuracy - drift_accuracy
print(f"\n📉 PERFORMANCE DROP due to drift: {performance_drop:.2%} ({performance_drop*100:.1f} percentage points)")

print(f"\nClassification report (post-drift test):")
print(classification_report(y_drift, y_drift_pred))

# Confusion matrix
cm = confusion_matrix(y_drift, y_drift_pred, labels=['new_inquiry', 'existing_issue'])
print("\nConfusion Matrix (post-drift):")
print(pd.DataFrame(cm, index=['Actual: new_inquiry', 'Actual: existing_issue'], 
                   columns=['Pred: new_inquiry', 'Pred: existing_issue']))

print("\n" + "="*70)
print("SUMMARY: Model Drift Analysis")
print("="*70)
print(f"Baseline accuracy (pre-drift):     {baseline_accuracy:.2%}")
print(f"Accuracy after drift:              {drift_accuracy:.2%}")
print(f"Performance degradation:           {performance_drop:.2%}")
print(f"\nThis performance drop IS model drift in action!")
print(f"The model learned patterns from old vocabulary that don't match new vocabulary.")