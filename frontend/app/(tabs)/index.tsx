import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, sessionToken, logout } = useAuthStore();
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCashFlow(), fetchInsight()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCashFlow = async () => {
    try {
      const response = await fetch(`${API_URL}/api/analytics/cash-flow`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCashFlow(data);
      }
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    }
  };

  const fetchInsight = async () => {
    try {
      setInsightLoading(true);
      const response = await fetch(`${API_URL}/api/analytics/insights`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInsight(data.insight);
      }
    } catch (error) {
      console.error('Error fetching insight:', error);
    } finally {
      setInsightLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !cashFlow) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  const pieData = cashFlow?.top_categories?.slice(0, 5).map((cat: any, index: number) => ({
    value: cat.amount,
    label: cat.name,
    color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#95E1D3'][index],
  })) || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'}!</Text>
          <Text style={styles.subGreeting}>Here's your financial overview</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Cash Flow Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This Month</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="arrow-down" size={24} color="#00B894" />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: '#00B894' }]}>
              ₹{cashFlow?.total_income?.toLocaleString('en-IN') || '0'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="arrow-up" size={24} color="#FF6B6B" />
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
              ₹{cashFlow?.total_expenses?.toLocaleString('en-IN') || '0'}
            </Text>
          </View>
        </View>
        <View style={styles.savingsContainer}>
          <Text style={styles.savingsLabel}>Net Savings</Text>
          <Text style={[styles.savingsValue, { color: (cashFlow?.savings || 0) >= 0 ? '#00B894' : '#FF6B6B' }]}>
            ₹{cashFlow?.savings?.toLocaleString('en-IN') || '0'}
          </Text>
          <View style={styles.savingsRateContainer}>
            <Text style={styles.savingsRate}>
              Savings Rate: {cashFlow?.savings_rate?.toFixed(1) || '0'}%
            </Text>
          </View>
        </View>
      </View>

      {/* AI Insight */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="bulb" size={24} color="#FDCB6E" />
            <Text style={styles.cardTitle}> AI Insight</Text>
          </View>
          <TouchableOpacity onPress={fetchInsight} disabled={insightLoading}>
            <Ionicons name="refresh" size={20} color="#6C5CE7" />
          </TouchableOpacity>
        </View>
        {insightLoading ? (
          <ActivityIndicator size="small" color="#6C5CE7" style={{ marginTop: 16 }} />
        ) : (
          <Text style={styles.insightText}>{insight || 'Start tracking expenses to get insights!'}</Text>
        )}
      </View>

      {/* Top Categories Chart */}
      {pieData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Spending Categories</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              donut
              radius={80}
              innerRadius={50}
              centerLabelComponent={() => (
                <View>
                  <Text style={styles.centerLabel}>Total</Text>
                  <Text style={styles.centerValue}>₹{cashFlow?.total_expenses?.toFixed(0) || '0'}</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.legendContainer}>
            {pieData.map((item: any, index: number) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
                <Text style={styles.legendValue}>₹{item.value.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="add-circle" size={32} color="#6C5CE7" />
            <Text style={styles.actionText}>Add Transaction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="stats-chart" size={32} color="#6C5CE7" />
            <Text style={styles.actionText}>View Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  savingsContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2c',
  },
  savingsLabel: {
    fontSize: 14,
    color: '#95a5a6',
  },
  savingsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  savingsRateContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
  },
  savingsRate: {
    fontSize: 12,
    color: '#ecf0f1',
  },
  insightText: {
    fontSize: 15,
    color: '#ecf0f1',
    lineHeight: 24,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  centerLabel: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
  },
  centerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#ecf0f1',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 8,
    textAlign: 'center',
  },
});
