import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface LoadingScreenProps {
  timeout?: number;
  onTimeout?: () => void;
}

export default function LoadingScreen({ timeout = 10000, onTimeout }: LoadingScreenProps) {
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
      <View style={styles.container}>
        <Image 
          source={require('../assets/splash-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.timeoutText}>Loading is taking longer than expected</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <Text style={styles.subtext}>If the problem persists, please restart the app</Text>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <Image 
          source={require('../assets/splash-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#40B5AD" style={styles.loader} />
        <Text style={styles.text}>Loading your app...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  loader: {
    marginVertical: 20,
  },
  text: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timeoutText: {
    fontSize: 16,
    color: '#EF4444',
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
    color: '#9CA3AF',
    textAlign: 'center',
  },
}); 