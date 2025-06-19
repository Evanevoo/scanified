import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LessAnnoyingScan</Text>
      <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      <Text style={styles.text}>Initializing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
}); 