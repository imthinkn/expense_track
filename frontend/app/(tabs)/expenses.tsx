import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, subMonths } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const { width } = Dimensions.get('window');

interface Transaction {
  transaction_id: string;
  amount: number;
  category: string;
  type: string;
  description?: string;
  date: string;
  tags: string[];
}

export default function ExpensesScreen() {
  const { sessionToken, user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // FAB Menu State
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnimation = new Animated.Value(0);
  
  // Modal States
  const [personalExpenseModal, setPersonalExpenseModal] = useState(false);
  const [groupExpenseModal, setGroupExpenseModal] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTransactions(), fetchCategories()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions?limit=100`, {
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

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const toggleFAB = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnimation, {
      toValue,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setFabOpen(!fabOpen);
  };

  const handleAddTransaction = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category: selectedCategory,
          type: selectedType,
          description: description || null,
          tags: [],
        }),
      });

      if (response.ok) {
        setPersonalExpenseModal(false);
        resetForm();
        fetchTransactions();
      } else {
        Alert.alert('Error', 'Failed to add transaction');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  const resetForm = () => {
    setAmount('');
    setSelectedCategory('');
    setDescription('');
    setSelectedType('expense');
  };

  // Calculate monthly stats
  const currentMonth = startOfMonth(new Date());
  const currentMonthTransactions = transactions.filter((t) => {
    const txnDate = new Date(t.date);
    return txnDate >= currentMonth && t.type === 'expense';
  });

  const totalExpense = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown
  const categoryBreakdown = categories
    .filter((cat) => cat.type === 'expense')
    .map((cat) => {
      const catTotal = currentMonthTransactions
        .filter((t) => t.category === cat.name)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...cat,
        total: catTotal,
        percentage: totalExpense > 0 ? (catTotal / totalExpense) * 100 : 0,
      };
    })
    .filter((cat) => cat.total > 0)
    .sort((a, b) => b.total - a.total);

  // Monthly history (last 6 months)
  const monthlyHistory = [];
  for (let i = 0; i < 6; i++) {
    const monthStart = subMonths(currentMonth, i);
    const monthEnd = startOfMonth(new Date(monthStart));
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    
    const monthTransactions = transactions.filter((t) => {
      const txnDate = new Date(t.date);
      return txnDate >= monthStart && txnDate < monthEnd && t.type === 'expense';
    });
    
    const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    monthlyHistory.push({
      month: format(monthStart, 'MMM yyyy'),
      total: monthTotal,
    });
  }

  const fabPersonalY = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const fabGroupY = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  const fabRotation = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const filteredCategories = categories.filter((cat) => cat.type === selectedType);

  return (
    <LinearGradient colors={['#7C3AED', '#5B21B6', '#4C1D95']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Expenses</Text>
        </View>

        {/* Overview Card */}
        <View style={styles.card}>
          <Text style={styles.overviewLabel}>Overview</Text>
          <Text style={styles.totalAmount}>-₹{totalExpense.toLocaleString('en-IN')}</Text>
          <Text style={styles.subInfo}>This month's spending</Text>
        </View>

        {/* Spending by Category */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending by category</Text>
          {categoryBreakdown.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pie-chart-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No expenses this month</Text>
            </View>
          ) : (
            categoryBreakdown.map((cat) => (
              <View key={cat.category_id} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                  </View>
                  <Text style={styles.categoryAmount}>-₹{cat.total.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Monthly History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly History</Text>
          {monthlyHistory.map((month, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyMonth}>{month.month}</Text>
              <Text style={styles.historyAmount}>₹{month.total.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        {/* Personal Expense Button */}
        <Animated.View style={[styles.fabOption, { transform: [{ translateY: fabPersonalY }] }]}>
          <TouchableOpacity
            style={styles.fabOptionButton}
            onPress={() => {
              setPersonalExpenseModal(true);
              toggleFAB();
            }}
          >
            <Ionicons name="person" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.fabLabel}>Personal</Text>
        </Animated.View>

        {/* Group Expense Button */}
        <Animated.View style={[styles.fabOption, { transform: [{ translateY: fabGroupY }] }]}>
          <TouchableOpacity
            style={styles.fabOptionButton}
            onPress={() => {
              setGroupExpenseModal(true);
              toggleFAB();
            }}
          >
            <Ionicons name="people" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.fabLabel}>Group</Text>
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity style={styles.fab} onPress={toggleFAB}>
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Ionicons name="add" size={32} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Personal Expense Modal */}
      <Modal
        visible={personalExpenseModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPersonalExpenseModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Personal Expense</Text>
              <TouchableOpacity onPress={() => setPersonalExpenseModal(false)}>
                <Ionicons name="close" size={28} color="#1F1B24" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'expense' && styles.typeButtonActive]}
                onPress={() => {
                  setSelectedType('expense');
                  setSelectedCategory('');
                }}
              >
                <Text style={[styles.typeText, selectedType === 'expense' && styles.typeTextActive]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'income' && styles.typeButtonActive]}
                onPress={() => {
                  setSelectedType('income');
                  setSelectedCategory('');
                }}
              >
                <Text style={[styles.typeText, selectedType === 'income' && styles.typeTextActive]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.category_id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.name && styles.categoryChipActive,
                      { borderColor: cat.color || '#8B5CF6' },
                    ]}
                    onPress={() => setSelectedCategory(cat.name)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat.name && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a note..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </ScrollView>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddTransaction}>
              <Text style={styles.submitButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Group Expense Modal */}
      <Modal
        visible={groupExpenseModal}
        animationType="slide"
        transparent
        onRequestClose={() => setGroupExpenseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Expense</Text>
              <TouchableOpacity onPress={() => setGroupExpenseModal(false)}>
                <Ionicons name="close" size={28} color="#1F1B24" />
              </TouchableOpacity>
            </View>
            <View style={styles.comingSoonContainer}>
              <Ionicons name="people" size={64} color="#8B5CF6" />
              <Text style={styles.comingSoonTitle}>Group Expenses</Text>
              <Text style={styles.comingSoonText}>
                Splitwise-like group expense tracking coming soon! Share bills with friends and track settlements.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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
  overviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F1B24',
    marginBottom: 8,
  },
  subInfo: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1B24',
    marginBottom: 16,
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1B24',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  progressBarContainer: {
    width: 100,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1B24',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyMonth: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1B24',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    alignItems: 'center',
  },
  fabOption: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  fabOptionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F1B24',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  typeText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#fff',
  },
  formScroll: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F1B24',
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#F3E8FF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#8B5CF6',
  },
  submitButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F1B24',
    marginTop: 16,
  },
  comingSoonText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 24,
  },
});
