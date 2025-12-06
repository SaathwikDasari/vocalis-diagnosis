import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Audio } from 'expo-av'; // Import Audio Library
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

// ---------------------------------------------------------
// 🔴 REPLACE THIS WITH YOUR LAPTOP'S IP ADDRESS
// Keep the :5000/predict part.
// Example: 'http://192.168.29.145:5000/predict'
const BACKEND_URL = 'http://10.153.133.95:5000/predict'; 
// ---------------------------------------------------------

type AppState = 'IDLE' | 'RECORDING' | 'PROCESSING';

export default function HomeScreen() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [predictionResult, setPredictionResult] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Press the button to begin voice screening.');
  
  // Audio State
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // --- 1. START RECORDING ---
  async function startRecording() {
    try {
      // Check permissions
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      }); 

      console.log('Starting recording..');
      setAppState('RECORDING');
      setStatusMessage('Recording... Say "Aaaah" steadily.');

      // Create recording object
      const { recording } = await Audio.Recording.createAsync( 
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      setStatusMessage('Error: Could not access microphone.');
      setAppState('IDLE');
    }
  }

  // --- 2. STOP & UPLOAD ---
  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    
    const uri = recording?.getURI(); 
    console.log('Recording stopped and stored at', uri);

    if (uri) {
      uploadAudio(uri);
    }
  }

  // --- 3. SEND TO PYTHON BACKEND ---
  async function uploadAudio(uri: string) {
    setAppState('PROCESSING');
    setStatusMessage('Uploading to VODA Engine...');

    const formData = new FormData();
    // React Native FormData expects an object with uri, name, and type
    formData.append('audio', {
      uri: uri,
      name: 'voice_sample.m4a',
      type: 'audio/m4a',
    } as any);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      console.log('Server Response:', result);

      if (result.error) {
        Alert.alert("Server Error", result.error);
        setAppState('IDLE');
        return;
      }

      // Update UI with Result
      // The backend returns 'risk_score' (Probability of Parkinson's).
      // We display 'Health Score' (100 - risk).
      const healthScore = 100 - result.risk_score;
      setPredictionResult(Math.round(healthScore));
      setStatusMessage('Analysis Complete.');
      setAppState('IDLE');

    } catch (error) {
      console.error('Network Request Failed:', error);
      Alert.alert("Connection Error", "Is your laptop IP correct? Are both devices on the same Wi-Fi?");
      setStatusMessage('Connection Failed.');
      setAppState('IDLE');
    }
  }

  // --- UI Handler ---
  const handlePress = () => {
    if (appState === 'IDLE') {
      startRecording();
    } else if (appState === 'RECORDING') {
      stopRecording();
    }
  };

  // --- Dynamic Styles ---
  const buttonText = appState === 'IDLE' ? 'START SCREENING' : (appState === 'RECORDING' ? 'STOP & ANALYZE' : 'PROCESSING...');
  const buttonStyle = appState === 'RECORDING' ? styles.recordButtonActive : styles.recordButton;
  const titleEmoji = appState === 'IDLE' ? '🟢' : (appState === 'RECORDING' ? '🔴' : '🟡');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <ThemedText type='title' style={styles.appTitle}>
          {titleEmoji} VODA
        </ThemedText>
        
        <ThemedView style={styles.statusBox}>
          <ThemedText type='subtitle' style={{textAlign: 'center'}}>{statusMessage}</ThemedText>
        </ThemedView>

        <TouchableOpacity 
          style={buttonStyle}
          onPress={handlePress}
          disabled={appState === 'PROCESSING'}
        >
          <ThemedText type='defaultSemiBold' style={styles.buttonText}>
            {buttonText}
          </ThemedText>
        </TouchableOpacity>
        
        <ThemedText style={styles.guidanceText}>
          Ensure you are in a quiet environment.
        </ThemedText>

        {predictionResult !== null && (
          <ThemedView style={styles.resultBox}>
            <ThemedText type='subtitle'>
              ✅ Screening Complete
            </ThemedText>
            <ThemedText type='title' style={styles.resultScore}>
              {predictionResult}%
            </ThemedText>
            <ThemedText type='default'>
              Vocal Health Score
            </ThemedText>
            {predictionResult < 85 && (
                <ThemedText type='defaultSemiBold' style={styles.riskWarning}>
                    ⚠️ Biomarkers detected. Consult a specialist.
                </ThemedText>
            )}
          </ThemedView>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 25, alignItems: 'center', paddingTop: 60 },
  appTitle: { marginBottom: 30, textAlign: 'center', fontSize: 28 },
  statusBox: { padding: 15, borderRadius: 10, marginBottom: 40, backgroundColor: '#E3F2FD', width: '100%', alignItems: 'center' },
  recordButton: { backgroundColor: '#4CAF50', paddingVertical: 20, borderRadius: 50, marginBottom: 15, width: 250, alignItems: 'center', elevation: 5 },
  recordButtonActive: { backgroundColor: '#F44336', paddingVertical: 20, borderRadius: 50, marginBottom: 15, width: 250, alignItems: 'center', elevation: 5 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  guidanceText: { color: '#888', marginBottom: 30 },
  resultBox: { marginTop: 10, padding: 25, borderRadius: 15, borderWidth: 2, borderColor: '#3f51b5', alignItems: 'center', width: '100%', backgroundColor: '#FAFAFA' },
  resultScore: { fontSize: 60, color: '#3f51b5', marginVertical: 10 },
  riskWarning: { color: '#D32F2F', marginTop: 15, textAlign: 'center' }
});