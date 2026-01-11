import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function LoansScreen() {
  const loans = [
    {
      id: '1',
      type: 'Home Loan',
      bank: 'HDFC Bank',
      outstanding: 2500000,
      emi: 28500,
      interest: 8.5,
      icon: 'home',
      color: '#3B82F6',
    },
    {
      id: '2',
      type: 'Car Loan',
      bank: 'ICICI Bank',
      outstanding: 450000,
      emi: 15000,
      interest: 9.2,
      icon: 'car',
      color: '#10B981',
    },
  ];

  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const totalEMI = loans.reduce((sum, loan) => sum + loan.emi, 0);

  return (
    <LinearGradient colors={['#7C3AED', '#5B21B6', '#4C1D95']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Loans & EMIs</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>
            <Text style={styles.summaryAmount}>₹{totalOutstanding.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Monthly EMI</Text>
            <Text style={styles.summaryAmount}>₹{totalEMI.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Loans List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Loans</Text>
          {loans.map((loan) => (
            <TouchableOpacity key={loan.id} style={styles.loanItem}>
              <View style={[styles.loanIcon, { backgroundColor: `${loan.color}20` }]}>
                <Ionicons name={loan.icon as any} size={24} color={loan.color} />
              </View>
              <View style={styles.loanDetails}>
                <Text style={styles.loanType}>{loan.type}</Text>
                <Text style={styles.loanBank}>{loan.bank}</Text>
                <View style={styles.loanStats}>
                  <Text style={styles.loanStat}>EMI: ₹{loan.emi.toLocaleString('en-IN')}</Text>
                  <Text style={styles.loanStat}>{loan.interest}% p.a.</Text>
                </View>
              </View>
              <View style={styles.loanAmount}>
                <Text style={styles.loanAmountText}>₹{loan.outstanding.toLocaleString('en-IN')}</Text>
                <Text style={styles.loanAmountLabel}>Outstanding</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Credit Score Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Credit Health</Text>
          <View style={styles.creditScore}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>750</Text>
              <Text style={styles.scoreLabel}>CIBIL Score</Text>
            </View>
            <View style={styles.scoreInfo}>
              <View style={styles.scoreItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.scoreText}>Good credit history</Text>
              </View>
              <View style={styles.scoreItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.scoreText}>Low credit utilization</Text>
              </View>
              <View style={styles.scoreItem}>
                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                <Text style={styles.scoreText}>Multiple active loans</Text>
              </View>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
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
  loanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  loanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanDetails: {
    flex: 1,
  },
  loanType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1B24',
    marginBottom: 4,
  },
  loanBank: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  loanStats: {
    flexDirection: 'row',
    gap: 16,
  },
  loanStat: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  loanAmount: {
    alignItems: 'flex-end',
  },
  loanAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F1B24',
    marginBottom: 4,
  },
  loanAmountLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  creditScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#374151',
  },
});
