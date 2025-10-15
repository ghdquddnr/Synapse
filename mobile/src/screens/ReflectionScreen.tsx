import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReflectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>회고</Text>
      <Text style={styles.subtitle}>주간 리포트가 여기에 표시됩니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
