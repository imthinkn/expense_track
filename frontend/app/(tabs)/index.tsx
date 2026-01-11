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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, sessionToken, logout } = useAuthStore();
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCashFlow(), fetchTransactions()]);
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
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCashFlow(data);
      }
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions?limit=3`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !cashFlow) {
    return (
      <LinearGradient colors={['#7C3AED', '#5B21B6', '#4C1D95']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  const netWorth = (cashFlow?.savings || 0);
  const milestone = 100000;
  const progress = Math.min((netWorth / milestone) * 100, 100);

  return (
    <LinearGradient colors={['#7C3AED', '#5B21B6', '#4C1D95']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'User'}!</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Net Worth Circular Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Net Worth</Text>
          <View style={styles.chartContainer}>
            <View style={styles.circularChart}>
              <View style={[styles.progressCircle, { borderColor: `rgba(139, 92, 246, ${progress / 100})` }]}>
                <View style={styles.innerCircle}>
                  <Text style={styles.netWorthAmount}>₹{Math.abs(netWorth).toLocaleString('en-IN')}</Text>
                  <Text style={styles.netWorthLabel}>Current</Text>
                </View>
              </View>
            </View>
            <View style={styles.milestoneContainer}>
              <View style={styles.milestoneItem}>
                <Ionicons name="flag" size={20} color="#8B5CF6" />
                <Text style={styles.milestoneText}>Target: ₹{milestone.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.milestoneItem}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
                <Text style={styles.milestoneText}>Progress: {progress.toFixed(1)}%</Text>
              </View>
              <View style={styles.milestoneItem}>
                <Ionicons name="cash" size={20} color="#F59E0B" />
                <Text style={styles.milestoneText}>Remaining: ₹{Math.max(milestone - netWorth, 0).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Expenses */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Expenses</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="rgba(139, 92, 246, 0.5)" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.slice(0, 3).map((txn) => (
              <View key={txn.transaction_id} style={styles.expenseItem}>
                <View style={styles.expenseIcon}>
                  <Ionicons
                    name={txn.type === 'income' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={txn.type === 'income' ? '#10B981' : '#EF4444'}
                  />
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseCategory}>{txn.category}</Text>
                  <Text style={styles.expenseDate}>{format(new Date(txn.date), 'MMM dd')}</Text>
                </View>
                <Text style={[styles.expenseAmount, { color: txn.type === 'income' ? '#10B981' : '#EF4444' }]}>
                  {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Goals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Goals</Text>
          <View style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <View style={styles.goalIcon}>
                <Ionicons name="home" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Emergency Fund</Text>
                <Text style={styles.goalProgress}>₹45,000 / ₹100,000</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '45%' }]} />
            </View>
            <Text style={styles.goalPercentage}>45% Complete</Text>
          </View>
          <View style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <View style={styles.goalIcon}>
                <Ionicons name="car" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Car Purchase</Text>
                <Text style={styles.goalProgress}>₹200,000 / ₹500,000</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '40%' }]} />
            </View>
            <Text style={styles.goalPercentage}>40% Complete</Text>
          </View>
        </View>

        {/* Insurance Coverage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insurance Coverage</Text>
          <View style={styles.insuranceGrid}>
            <View style={styles.insuranceCard}>
              <Ionicons name="medical" size={32} color="#10B981" />
              <Text style={styles.insuranceLabel}>Health</Text>
              <Text style={styles.insuranceAmount}>₹5 Lac</Text>
            </View>
            <View style={styles.insuranceCard}>
              <Ionicons name="shield-checkmark" size={32} color="#3B82F6" />
              <Text style={styles.insuranceLabel}>Term Life</Text>
              <Text style={styles.insuranceAmount}>₹1 Cr</Text>
            </View>
            <View style={styles.insuranceCard}>
              <Ionicons name="car-sport" size={32} color="#F59E0B" />
              <Text style={styles.insuranceLabel}>Vehicle</Text>
              <Text style={styles.insuranceAmount}>Own Damage</Text>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1B24',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
  },
  circularChart: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  netWorthAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F1B24',
  },
  netWorthLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  milestoneContainer: {
    width: '100%',
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  milestoneText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1B24',
  },
  expenseDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalItem: {
    marginBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1B24',
  },
  goalProgress: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  goalPercentage: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  insuranceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  insuranceCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  insuranceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  insuranceAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F1B24',
    marginTop: 4,
  },
});
