import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
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
  tags: string[];
}

interface Category {
  category_id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export default function ExpensesScreen() {
  const { sessionToken } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Form state
  const [amount, setAmount] = useState('');
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTransactions(), fetchCategories()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const url = filter === 'all'
        ? `${API_URL}/api/transactions?limit=50`
        : `${API_URL}/api/transactions?limit=50&type=${filter}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
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
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
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
        setModalVisible(false);
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

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const resetForm = () => {
    setAmount('');
    setSelectedCategory('');
    setDescription('');
    setSelectedType('expense');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredCategories = categories.filter((cat) => cat.type === selectedType);

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'income' && styles.filterTabActive]}
          onPress={() => setFilter('income')}
        >
          <Text style={[styles.filterText, filter === 'income' && styles.filterTextActive]}>
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'expense' && styles.filterTabActive]}
          onPress={() => setFilter('expense')}
        >
          <Text style={[styles.filterText, filter === 'expense' && styles.filterTextActive]}>
            Expenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#95a5a6" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first transaction</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.transaction_id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: transaction.type === 'income' ? '#00B89420' : '#FF6B6B20' },
                  ]}
                >
                  <Ionicons
                    name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={transaction.type === 'income' ? '#00B894' : '#FF6B6B'}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionCategory}>{transaction.category}</Text>
                  {transaction.description && (
                    <Text style={styles.transactionDescription} numberOfLines={1}>
                      {transaction.description}
                    </Text>
                  )}
                  <Text style={styles.transactionDate}>
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
                  </Text>
                </View>
              </View>
              <View style={styles.transactionRight}>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'income' ? '#00B894' : '#FF6B6B' },
                  ]}
                >
                  {transaction.type === 'income' ? '+' : '-'}₹
                  {transaction.amount.toLocaleString('en-IN')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Delete Transaction', 'Are you sure?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => handleDeleteTransaction(transaction.transaction_id),
                      },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#95a5a6" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'expense' && styles.typeButtonActive]}
                onPress={() => {
                  setSelectedType('expense');
                  setSelectedCategory('');
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={selectedType === 'expense' ? '#fff' : '#95a5a6'}
                />
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
                <Ionicons
                  name="arrow-down"
                  size={20}
                  color={selectedType === 'income' ? '#fff' : '#95a5a6'}
                />
                <Text style={[styles.typeText, selectedType === 'income' && styles.typeTextActive]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {/* Amount */}
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#95a5a6"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              {/* Category */}
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.category_id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.name && styles.categoryChipActive,
                      { borderColor: cat.color || '#6C5CE7' },
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

              {/* Description */}
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a note..."
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </ScrollView>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton} onPress={handleAddTransaction}>
              <Text style={styles.submitButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
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
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#6C5CE7',
  },
  filterText: {
    fontSize: 14,
    color: '#95a5a6',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#ecf0f1',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  transactionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  transactionDescription: {
    fontSize: 13,
    color: '#95a5a6',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2c2c2c',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  typeText: {
    fontSize: 16,
    color: '#95a5a6',
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
    color: '#ecf0f1',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
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
    backgroundColor: '#2c2c2c',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#6C5CE720',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#6C5CE7',
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
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
});
