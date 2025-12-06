import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Audio } from 'expo-av';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const BACKEND_URL = 'http://10.227.219.95:5000/predict'; 
type AppState = 'IDLE' | 'RECORDING' | 'PROCESSING';

interface RecordingButtonProps {
  onPress: () => void;
  isRecording: boolean;
  isProcessing: boolean;
}

interface Biomarkers {
    jitter: number;
    shimmer: number;
    hnr: number;
}


// --- RECORDING BUTTON COMPONENT ---
const RecordingButton = ({ onPress, isRecording, isProcessing }: RecordingButtonProps) => {
  const buttonText = isProcessing ? 'ANALYZING...' : (isRecording ? 'STOP & ANALYZE' : 'START SCREENING');
  const buttonColor = isProcessing ? '#FFC107' : (isRecording ? '#E53935' : '#4CAF50');

  return (
    <TouchableOpacity 
      style={[styles.recordButton, { backgroundColor: buttonColor }]}
      onPress={onPress}
      disabled={isProcessing}
    >
      <Text style={styles.buttonText}>{buttonText}</Text>
    </TouchableOpacity>
  );
};


// MAIN SCREEN COMPONENT

export default function HomeScreen() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [predictionResult, setPredictionResult] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Press the button to begin vocal screening.');
  
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  const [biomarkers, setBiomarkers] = useState<Biomarkers | null>(null);


  // --- 1. START RECORDING ---
  async function startRecording() {
    try {
      if (!permissionResponse) {
        await requestPermission();
        return; 
      }
      
      if (permissionResponse.status !== 'granted') {
        const response = await requestPermission(); 
        if (response.status !== 'granted') {
            Alert.alert("Permission Denied", "Microphone access is required for VODA screening.");
            setAppState('IDLE');
            return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      }); 

      setAppState('RECORDING');
      setStatusMessage('🔴 RECORDING... Say "Aaaah" steadily for 4 seconds.');

      const { recording } = await Audio.Recording.createAsync( 
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);

    } catch (err) {
      console.error('Failed to start recording', err);
      setStatusMessage('Error: Could not access microphone.');
      setAppState('IDLE');
    }
  }

  // --- 2. STOP & UPLOAD ---
  async function stopRecording() {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync(); 
      const uri = recording.getURI(); 
      
      setRecording(undefined); 
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      if (uri) {
        uploadAudio(uri);
      } else {
        setStatusMessage('Error: Failed to retrieve audio file.');
        setAppState('IDLE');
      }
    } catch (error) {
      console.error('CRASH ERROR during stopRecording:', error);
      Alert.alert("Stop Error", "Audio stop failed. Check device console.");
      setAppState('IDLE');
    }
  }

  // --- 3. SEND TO PYTHON BACKEND ---
  async function uploadAudio(uri: string) {
    setAppState('PROCESSING');
    setStatusMessage('🟡 PROCESSING: Uploading and analyzing biomarkers...');

    const formData = new FormData();
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
      
      if (result.error) {
        Alert.alert("Server Error", result.error);
        setAppState('IDLE');
        return;
      }

      // Save Biomarkers and Calculate Health Score
      setBiomarkers(result.biomarkers);
      const healthScore = 100 - result.risk_score;
      setPredictionResult(Math.round(healthScore));
      
      setStatusMessage('✅ Analysis Complete.');
      setAppState('IDLE');

    } catch (error) {
      console.error('Network Request Failed:', error);
      Alert.alert("Connection Error", "Network or server issue. Check IP/Wi-Fi.");
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
  const buttonColor = appState === 'PROCESSING' ? '#FFC107' : (appState === 'RECORDING' ? '#E53935' : '#4CAF50');
  const titleEmoji = appState === 'IDLE' ? '🟢' : (appState === 'RECORDING' ? '🔴' : '🟡');
  const healthColor = predictionResult && predictionResult > 80 ? '#4CAF50' : '#FF5252';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <ThemedText style={styles.appTitle}>
          {titleEmoji} VODA 🎙️
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Vocal Diagnostic Assistant
        </ThemedText>
        
        <ThemedView style={styles.statusBox}>
          <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
        </ThemedView>

        <RecordingButton 
          onPress={handlePress}
          isRecording={appState === 'RECORDING'}
          isProcessing={appState === 'PROCESSING'}
        />
        
        <ThemedText style={styles.guidanceText}>
          Hold the phone close to your mouth.
        </ThemedText>


        {/* --- VISUAL REPORT CARD --- */}
        {predictionResult !== null && biomarkers !== null && (
          <ThemedView style={styles.cardContainer}>
            
            <ThemedView style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>DIAGNOSTIC REPORT</ThemedText>
              <View style={[styles.badge, { backgroundColor: predictionResult > 80 ? '#E8F5E9' : '#FFEBEE' }]}>
                <ThemedText style={{ color: healthColor, fontWeight: 'bold', fontSize: 12 }}>
                  {predictionResult > 80 ? 'HEALTHY' : 'ATTENTION'}
                </ThemedText>
              </View>
            </ThemedView>

            <View style={styles.gaugeContainer}>
              <View style={[styles.gaugeCircle, { borderColor: healthColor }]}>
                <ThemedText style={[styles.gaugeScore, { color: healthColor }]}>
                  {predictionResult}%
                </ThemedText>
                <ThemedText style={styles.gaugeLabel}>VOCAL HEALTH</ThemedText>
              </View>
            </View>

            <View style={styles.metricsContainer}>
              <ThemedText style={styles.sectionHeader}>Acoustic Biomarkers</ThemedText>
              
              <View style={styles.metricRow}>
                <View style={styles.metricInfo}>
                  <ThemedText style={styles.metricLabel}>Jitter (Stability)</ThemedText>
                  <ThemedText style={styles.metricValue}>{biomarkers?.jitter?.toFixed(3) || '---'}%</ThemedText>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { 
                    width: `${Math.min(100 - (biomarkers?.jitter || 0) * 50, 100)}%`, 
                    backgroundColor: (biomarkers?.jitter || 1) < 1.0 ? '#4CAF50' : '#FFC107' 
                  }]} />
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricInfo}>
                  <ThemedText style={styles.metricLabel}>Shimmer (Loudness)</ThemedText>
                  <ThemedText style={styles.metricValue}>{biomarkers?.shimmer?.toFixed(3) || '---'} dB</ThemedText>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { 
                    width: `${Math.min(100 - (biomarkers?.shimmer || 0) * 200, 100)}%`, // Scale for visual
                    backgroundColor: (biomarkers?.shimmer || 1) < 0.3 ? '#4CAF50' : '#FFC107' 
                  }]} />
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricInfo}>
                  <ThemedText style={styles.metricLabel}>Signal Quality (HNR)</ThemedText>
                  <ThemedText style={styles.metricValue}>{biomarkers?.hnr?.toFixed(1) || '---'} dB</ThemedText>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { 
                    width: `${Math.min((biomarkers?.hnr || 0) * 5, 100)}%`, // Scale HNR (High is good)
                    backgroundColor: (biomarkers?.hnr || 0) > 15 ? '#2196F3' : '#FF5252' 
                  }]} />
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                {predictionResult > 80 
                  ? "✅ No significant vocal anomalies detected. Result based on mobile calibration."
                  : "⚠️ Irregularities found. Consult a specialist for clinical screening."}
              </ThemedText>
            </View>

          </ThemedView>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// --- STYLING ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 25, alignItems: 'center', paddingTop: 60 },
  appTitle: { fontSize: 28, fontWeight: 'bold', color: '#3f51b5', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40, textAlign: 'center' },
  statusBox: { padding: 15, borderRadius: 10, marginBottom: 40, backgroundColor: '#E3F2FD', width: '100%', alignItems: 'center' },
  statusText: { fontSize: 16, fontWeight: '600', color: '#006064', textAlign: 'center' },
  recordButton: { backgroundColor: '#4CAF50', paddingVertical: 18, borderRadius: 50, marginBottom: 30, width: 280, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 8 },
  recordButtonActive: { backgroundColor: '#E53935', paddingVertical: 18, borderRadius: 50, marginBottom: 30, width: 280, alignItems: 'center', elevation: 8 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  guidanceText: { color: '#888', marginBottom: 30, textAlign: 'center' },

  // Card Styles
  cardContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 15 },
  cardTitle: { fontSize: 14, color: '#888', letterSpacing: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  gaugeContainer: { alignItems: 'center', marginVertical: 15 },
  gaugeCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  gaugeScore: { fontSize: 42, fontWeight: 'bold' },
  gaugeLabel: { fontSize: 12, color: '#AAA', marginTop: -5 },

  // Metrics Bar Styles
  metricsContainer: { width: '100%', marginTop: 15 },
  sectionHeader: { fontSize: 16, fontWeight: '600', marginBottom: 15, color: '#333' },
  metricRow: { marginBottom: 15 },
  metricInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  metricLabel: { fontSize: 14, color: '#555' },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  progressBarBg: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  footer: { marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  footerText: { textAlign: 'center', fontSize: 13, color: '#666', fontStyle: 'italic' }
});