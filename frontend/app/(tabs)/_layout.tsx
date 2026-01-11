import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

function TabBarBackground() {
  return (
    <BlurView
      intensity={80}
      style={StyleSheet.absoluteFill}
      tint="dark"
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#5B21B6',
          borderTopWidth: 0,
          height: 75,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerButtonContainer}>
              <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
                <Ionicons name="add" size={32} color="#fff" />
              </View>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    top: -25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#1F1B24',
  },
  centerButtonActive: {
    backgroundColor: '#8B5CF6',
    transform: [{ scale: 1.05 }],
  },
});
