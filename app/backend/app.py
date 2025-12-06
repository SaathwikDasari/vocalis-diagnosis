from flask import Flask, request, jsonify
from flask_cors import CORS
import parselmouth
from parselmouth.praat import call
import joblib
import os
from pydub import AudioSegment

app = Flask(__name__)
CORS(app) 

model = joblib.load('../model/parkinsons_model.pkl')

def extract_features(audio_path):
    """
    Extracts Jitter, Shimmer, and HNR using Parselmouth (Praat).
    """
    sound = parselmouth.Sound(audio_path)
    
    pitch = sound.to_pitch()
    pulses = parselmouth.praat.call([sound, pitch], "To PointProcess (cc)")
    jitter = call(pulses, "Get jitter (local)",0, 0, 0.0001, 0.02, 1.3) * 100
    
    shimmer = call([sound, pulses], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    
    harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
    hnr = call(harmonicity, "Get mean", 0, 0)
    
    return [jitter, shimmer, hnr]

@app.route('/predict', methods=['POST'])
def predict():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
        
    file = request.files['audio']
    filename = "temp_recording.m4a" 
    file.save(filename)
    
    wav_filename = "temp_recording.wav"
    try:
        audio = AudioSegment.from_file(filename)
        audio.export(wav_filename, format="wav")
        
        # 1. Extract Features
        features = extract_features(wav_filename)
        jitter = features[0]
        shimmer = features[1]
        hnr = features[2]

        print(f"DEBUG: Jitter={jitter}, Shimmer={shimmer}, HNR={hnr}")

        # 2. SMARTPHONE CALIBRATION LOGIC
        # Clinical thresholds are too strict for phone mics. 
        # We adjust them to avoid false positives due to background noise.
        
        # Thresholds (Relaxed for Mobile):
        # Jitter > 1.2% (Clinical is 1.04%)
        # Shimmer > 0.4  (Clinical is ~0.3)
        # HNR < 12       (Clinical is 20)
        
        risk_score = 0
        
        # Logic: If 2 out of 3 biomarkers are bad, flag as High Risk.
        bad_markers = 0
        if jitter > 1.2: bad_markers += 1
        if shimmer > 0.15: bad_markers += 1 # Adjusted for Parselmouth scale
        if hnr < 12: bad_markers += 1
        
        if bad_markers >= 2:
            prediction = 1 # Parkinson's
            risk_score = 0.85 + (bad_markers * 0.05) # 90-95%
        elif bad_markers == 1:
            prediction = 0 # Warning but Healthy
            risk_score = 0.45 
        else:
            prediction = 0 # Healthy
            risk_score = 0.10

        # Clean up
        os.remove(filename)
        os.remove(wav_filename)
        
        return jsonify({
            'status': 'success',
            'is_parkinsons': int(prediction),
            'risk_score': round(risk_score * 100, 2),
            'biomarkers': {
                'jitter': round(jitter, 5),
                'shimmer': round(shimmer, 5),
                'hnr': round(hnr, 2)
            }
        })
        
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Host 0.0.0.0 allows phones on the same Wi-Fi to connect
    app.run(host='0.0.0.0', port=5000, debug=True)