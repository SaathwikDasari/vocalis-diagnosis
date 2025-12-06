import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

// Define the three core states of the application
type AppState = 'IDLE' | 'RECORDING' | 'PROCESSING';

export default function HomeScreen() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [predictionResult, setPredictionResult] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Press the button to begin voice screening.');

  // --- Handlers (Mocked for UI) ---
  const handleRecordPress = () => {
    if (appState === 'IDLE') {
      // Start Recording Logic
      setAppState('RECORDING');
      setStatusMessage('Recording voice sample... please say "Aaaah".');
      setPredictionResult(null);

      // --- MOCK: Simulate recording/processing time (3 seconds) ---
      setTimeout(() => {
        setAppState('PROCESSING');
        setStatusMessage('Analyzing acoustic biomarkers (Jitter/Shimmer)...');
      }, 3000);

      // --- MOCK: Simulate result delivery (5 seconds total) ---
      setTimeout(() => {
        setAppState('IDLE');
        // Mock a 15% risk result (e.g., 85% healthy score)
        setPredictionResult(85); 
        setStatusMessage('Analysis Complete. Scroll down for results.');
      }, 5000);

    } else if (appState === 'RECORDING') {
      // Stop Recording Logic
      // In a real app, this would trigger the actual stop/upload/processing
      // For this UI, we let the timeout finish, but a user could stop early.
      setStatusMessage('Please wait for analysis to complete...');
    }
  };
  
  // --- UI Logic Helpers ---
  const buttonText = appState === 'IDLE' ? 'START SCREENING' : (appState === 'RECORDING' ? 'STOP RECORDING' : 'ANALYZING...');
  const buttonStyle = appState === 'RECORDING' ? styles.recordButtonActive : styles.recordButton;
  
  // Emojis for status feedback
  const titleEmoji = appState === 'IDLE' ? '🟢' : (appState === 'RECORDING' ? '🔴' : '🟡');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <ThemedText type='title' style={styles.appTitle}>
          {titleEmoji} VODA: Vocalis Diagnostic Assistant
        </ThemedText>
        
        {/* --- 1. Status Display Area --- */}
        <ThemedView style={styles.statusBox}>
          <ThemedText type='subtitle'>{statusMessage}</ThemedText>
        </ThemedView>

        {/* --- 2. Recording Button --- */}
        <TouchableOpacity 
          style={buttonStyle}
          onPress={handleRecordPress}
          disabled={appState === 'PROCESSING'} // Disable while processing
        >
          <ThemedText type='defaultSemiBold' style={styles.buttonText}>
            {buttonText}
          </ThemedText>
        </TouchableOpacity>
        
        <ThemedText style={styles.guidanceText}>
          Ensure you are in a quiet environment.
        </ThemedText>

        {/* --- 3. Prediction Result Area --- */}
        {predictionResult !== null && (
          <ThemedView style={styles.resultBox}>
            <ThemedText type='subtitle'>
              ✅ Screening Complete!
            </ThemedText>
            <ThemedText type='title' style={styles.resultScore}>
              {predictionResult}%
            </ThemedText>
            <ThemedText type='default'>
              Confidence Score (Healthy Signal Integrity)
            </ThemedText>
            {predictionResult < 90 && (
                <ThemedText type='defaultSemiBold' style={styles.riskWarning}>
                    *Low score indicates risk. Consult a specialist.
                </ThemedText>
            )}
          </ThemedView>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styling ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    padding: 25,
    alignItems: 'center',
  },
  appTitle: {
    marginBottom: 30,
    textAlign: 'center',
    fontSize: 24,
  },
  statusBox: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 40,
    backgroundColor: '#3f51b520', // Light blue background for status
    width: '100%',
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#4CAF50', // Green for Idle/Start
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 15,
    width: 250,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#F44336', // Red for Recording
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 15,
    width: 250,
    alignItems: 'center',
    // Pulsating effect visual idea: change scale in a real app animation
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
  guidanceText: {
    color: '#888',
    marginBottom: 50,
  },
  resultBox: {
    marginTop: 20,
    padding: 25,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3f51b5',
    alignItems: 'center',
    width: '100%',
  },
  resultScore: {
    fontSize: 60,
    color: '#3f51b5',
    marginVertical: 10,
  },
  riskWarning: {
    color: '#D32F2F',
    marginTop: 10,
    textAlign: 'center',
  }
});