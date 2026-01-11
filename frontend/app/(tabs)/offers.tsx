import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OffersScreen() {
  const mockOffers = [
    {
      id: '1',
      title: 'Get 50% cashback on UPI payments',
      description: 'Use promo code SAVE50 on your next payment',
      category: 'Payments',
      icon: 'card',
      color: '#6C5CE7',
    },
    {
      id: '2',
      title: 'Personal Loan at 10.5% interest',
      description: 'Quick approval, minimal documentation',
      category: 'Loans',
      icon: 'cash',
      color: '#00B894',
    },
    {
      id: '3',
      title: 'Term Insurance starting at ₹500/month',
      description: '₹1 Crore coverage for your family',
      category: 'Insurance',
      icon: 'shield',
      color: '#FF6B6B',
    },
    {
      id: '4',
      title: 'Premium Credit Card - Zero Joining Fee',
      description: 'Earn 5% cashback on all purchases',
      category: 'Credit Cards',
      icon: 'card-outline',
      color: '#FDCB6E',
    },
    {
      id: '5',
      title: 'Invest in Mutual Funds - Zero Commission',
      description: 'Start your SIP with as low as ₹500',
      category: 'Investments',
      icon: 'trending-up',
      color: '#A8E6CF',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offers & Recommendations</Text>
        <Text style={styles.subtitle}>Contextual financial products</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={20} color="#6C5CE7" />
          <Text style={styles.disclaimerText}>
            These are mock offers for demonstration. Real offers will be based on your financial profile.
          </Text>
        </View>

        {/* Offers List */}
        {mockOffers.map((offer) => (
          <TouchableOpacity key={offer.id} style={styles.offerCard} activeOpacity={0.7}>
            <View style={[styles.offerIcon, { backgroundColor: `${offer.color}20` }]}>
              <Ionicons name={offer.icon as any} size={28} color={offer.color} />
            </View>
            <View style={styles.offerContent}>
              <View style={styles.offerHeader}>
                <Text style={styles.offerCategory}>{offer.category}</Text>
              </View>
              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerDescription}>{offer.description}</Text>
              <View style={styles.offerFooter}>
                <Text style={styles.learnMore}>Learn More</Text>
                <Ionicons name="arrow-forward" size={16} color="#6C5CE7" />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Offers Work</Text>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={20} color="#00B894" />
            <Text style={styles.infoText}>Privacy-first recommendations</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="analytics" size={20} color="#00B894" />
            <Text style={styles.infoText}>Based on your financial data</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="close-circle" size={20} color="#00B894" />
            <Text style={styles.infoText}>No intrusive ads</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="lock-closed" size={20} color="#00B894" />
            <Text style={styles.infoText}>Your data is never sold</Text>
          </View>
        </View>
      </ScrollView>
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
  subtitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 0,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#6C5CE720',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#ecf0f1',
    lineHeight: 20,
  },
  offerCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  offerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  offerContent: {
    flex: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerCategory: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: '#95a5a6',
    lineHeight: 20,
    marginBottom: 12,
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  learnMore: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '600',
    marginRight: 4,
  },
  infoSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#ecf0f1',
  },
});
