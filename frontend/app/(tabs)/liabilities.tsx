import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LiabilitiesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Liabilities</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="card" size={64} color="#6C5CE7" />
          <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
          <Text style={styles.comingSoonText}>
            Manage all your loans, credit cards, and liabilities in one place.
          </Text>
          <View style={styles.featuresList}>
            <FeatureItem text="Track EMIs and loans" />
            <FeatureItem text="Debt-to-income ratio" />
            <FeatureItem text="Prepayment recommendations" />
            <FeatureItem text="Credit card management" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name="checkmark-circle" size={20} color="#00B894" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
  },
  comingSoonContainer: {
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  featuresList: {
    marginTop: 32,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#ecf0f1',
  },
});
