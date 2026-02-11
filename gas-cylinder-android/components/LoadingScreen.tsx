import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LoadingScreenProps {
  timeout?: number;
  onTimeout?: () => void;
}

export default function LoadingScreen({ timeout = 10000, onTimeout }: LoadingScreenProps) {
  const { colors } = useTheme();
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  const handleRetry = () => {
    setShowTimeoutMessage(false);
    if (onTimeout) {
      onTimeout();
    }
  };

  if (showTimeoutMessage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image 
          source={require('../assets/splash-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.primary }]}>Scanified</Text>
        <Text style={[styles.timeoutText, { color: colors.error }]}>Loading is taking longer than expected</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>If the problem persists, please restart the app</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image 
        source={require('../assets/splash-icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: colors.primary }]}>Scanified</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>Loading your app...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 40,
    borderRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
    letterSpacing: 1,
  },
  loader: {
    marginVertical: 20,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeoutText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 