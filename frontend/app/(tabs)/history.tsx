import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface Transaction {
  transaction_id: string;
  amount: number;
  category: string;
  type: string;
  description?: string;
  date: string;
}

export default function HistoryScreen() {
  const { sessionToken } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions?limit=50`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const groupedTransactions = transactions.reduce((groups: any, txn) => {
    const date = format(new Date(txn.date), 'dd MMM yyyy');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(txn);
    return groups;
  }, {});

  return (
    <LinearGradient colors={['#7C3AED', '#5B21B6', '#4C1D95']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'week' && styles.filterTabActive]}
          onPress={() => setFilter('week')}
        >
          <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>This Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'month' && styles.filterTabActive]}
          onPress={() => setFilter('month')}
        >
          <Text style={[styles.filterText, filter === 'month' && styles.filterTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(groupedTransactions).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>No transaction history</Text>
          </View>
        ) : (
          Object.keys(groupedTransactions).map((date) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              <View style={styles.card}>
                {groupedTransactions[date].map((txn: Transaction) => (
                  <View key={txn.transaction_id} style={styles.transactionItem}>
                    <View style={[styles.txnIcon, { backgroundColor: txn.type === 'income' ? '#10B98120' : '#EF444420' }]}>
                      <Ionicons
                        name={txn.type === 'income' ? 'arrow-down' : 'arrow-up'}
                        size={20}
                        color={txn.type === 'income' ? '#10B981' : '#EF4444'}
                      />
                    </View>
                    <View style={styles.txnDetails}>
                      <Text style={styles.txnCategory}>{txn.category}</Text>
                      {txn.description && (
                        <Text style={styles.txnDescription} numberOfLines={1}>
                          {txn.description}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.txnAmount, { color: txn.type === 'income' ? '#10B981' : '#EF4444' }]}>
                      {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnDetails: {
    flex: 1,
  },
  txnCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1B24',
  },
  txnDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
