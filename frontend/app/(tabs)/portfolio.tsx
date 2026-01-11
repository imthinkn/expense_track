import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function PortfolioScreen() {
  const { sessionToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const assets = [
    { id: '1', name: 'Mutual Funds', amount: 125000, change: 12.5, icon: 'trending-up', color: '#10B981' },
    { id: '2', name: 'Stocks', amount: 85000, change: -3.2, icon: 'stats-chart', color: '#EF4444' },
    { id: '3', name: 'Fixed Deposits', amount: 200000, change: 5.8, icon: 'lock-closed', color: '#F59E0B' },
    { id: '4', name: 'Gold', amount: 50000, change: 8.3, icon: 'diamond', color: '#FBBF24' },
  ];

  const totalPortfolio = assets.reduce((sum, asset) => sum + asset.amount, 0);

  useEffect(() => {
    setLoading(false);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#7C3AED', '#5B21B6', '#4C1D95']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#7C3AED', '#5B21B6', '#4C1D95']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Portfolio</Text>
        </View>

        {/* Total Value Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Portfolio Value</Text>
          <Text style={styles.totalAmount}>₹{totalPortfolio.toLocaleString('en-IN')}</Text>
          <View style={styles.changeContainer}>
            <Ionicons name="trending-up" size={16} color="#10B981" />
            <Text style={styles.changeText}>+7.8% this month</Text>
          </View>
        </View>

        {/* Asset Allocation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Asset Allocation</Text>
          {assets.map((asset) => (
            <TouchableOpacity key={asset.id} style={styles.assetItem}>
              <View style={[styles.assetIcon, { backgroundColor: `${asset.color}20` }]}>
                <Ionicons name={asset.icon as any} size={24} color={asset.color} />
              </View>
              <View style={styles.assetDetails}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <View style={styles.assetChange}>
                  <Ionicons
                    name={asset.change >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={asset.change >= 0 ? '#10B981' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.assetChangeText,
                      { color: asset.change >= 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {Math.abs(asset.change)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.assetAmount}>₹{asset.amount.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="add-circle" size={28} color="#8B5CF6" />
              <Text style={styles.actionText}>Add Investment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="refresh" size={28} color="#8B5CF6" />
              <Text style={styles.actionText}>Sync Portfolio</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1B24',
    marginBottom: 16,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetDetails: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1B24',
    marginBottom: 4,
  },
  assetChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetChangeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F1B24',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
});
