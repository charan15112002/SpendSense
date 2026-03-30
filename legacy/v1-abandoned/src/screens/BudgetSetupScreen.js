import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BUDGET_STYLES = [
  {
    id: '50-30-20',
    name: '50 / 30 / 20 Rule',
    icon: '⚖️',
    tagline: 'Balanced and simple',
    desc: '50% needs · 30% wants · 20% savings',
    best: 'A strong default if you want clear limits without overthinking',
    color: '#5B4FE8',
    bg: '#EEF0FF',
    allocations: {
      needs: 0.5,
      wants: 0.3,
      savings: 0.2,
    },
  },
  {
    id: 'zero-based',
    name: 'Zero-Based Budget',
    icon: '🎯',
    tagline: 'Every rupee assigned',
    desc: 'Income minus all planned spending should be ₹0',
    best: 'Good if you want very tight control of every category',
    color: '#EF233C',
    bg: '#FFF0F2',
    allocations: {
      needs: 0.45,
      wants: 0.35,
      savings: 0.2,
    },
  },
  {
    id: 'pay-yourself-first',
    name: 'Pay Yourself First',
    icon: '🏦',
    tagline: 'Save first, spend the rest',
    desc: 'Push more money to savings before everyday spending',
    best: 'Good if savings usually get postponed to month end',
    color: '#06D6A0',
    bg: '#F0FEF8',
    allocations: {
      needs: 0.5,
      wants: 0.2,
      savings: 0.3,
    },
  },
  {
    id: '60-solution',
    name: '60% Solution',
    icon: '🧩',
    tagline: 'Committed expenses first',
    desc: 'Focus on essentials, then split the rest with less micromanagement',
    best: 'Useful when your fixed commitments dominate the month',
    color: '#FFB703',
    bg: '#FFFBF0',
    allocations: {
      needs: 0.6,
      wants: 0.2,
      savings: 0.2,
    },
  },
  {
    id: '80-20',
    name: '80 / 20 Rule',
    icon: '😌',
    tagline: 'Save 20, spend 80',
    desc: 'A lighter budget with fewer restrictions',
    best: 'Good if strict budgeting feels overwhelming',
    color: '#FF8500',
    bg: '#FFF5EC',
    allocations: {
      needs: 0.55,
      wants: 0.25,
      savings: 0.2,
    },
  },
];

export function calculateBudgetLimits(monthlyIncome, styleId) {
  const income = Number(monthlyIncome) || 0;
  const style = BUDGET_STYLES.find(item => item.id === styleId) || BUDGET_STYLES[0];
  const { needs, wants, savings } = style.allocations;

  const needsAmount = income * needs;
  const wantsAmount = income * wants;
  const savingsAmount = income * savings;

  return {
    bills: Math.round(needsAmount * 0.35),
    groceries: Math.round(needsAmount * 0.2),
    medical: Math.round(needsAmount * 0.1),
    emi: Math.round(needsAmount * 0.25),
    misc: Math.round(needsAmount * 0.1),
    food: Math.round(wantsAmount * 0.3),
    travel: Math.round(wantsAmount * 0.2),
    shopping: Math.round(wantsAmount * 0.25),
    entertainment: Math.round(wantsAmount * 0.15),
    subscription: Math.round(wantsAmount * 0.1),
    investment: Math.round(savingsAmount * 0.6),
    family: Math.round(savingsAmount * 0.4),
  };
}

export default function BudgetSetupScreen({ monthlyIncome = 0, onComplete }) {
  const [selected, setSelected] = useState('50-30-20');

  const handleDone = async () => {
    await AsyncStorage.setItem('budget_style', selected);
    onComplete?.(selected);
  };

  const selectedStyle = BUDGET_STYLES.find(style => style.id === selected);
  const previewIncome = Number(monthlyIncome) || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>💼</Text>
          <Text style={styles.heroTitle}>Choose a budget style</Text>
          <Text style={styles.heroSub}>
            SpendSense will build category limits from your monthly income of ₹
            {Math.round(previewIncome).toLocaleString('en-IN')}.
          </Text>
        </View>

        {BUDGET_STYLES.map(style => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.card,
              selected === style.id && {
                borderColor: style.color,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelected(style.id)}>
            <View style={styles.cardTop}>
              <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
                <Text style={{ fontSize: 22 }}>{style.icon}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.styleName}>{style.name}</Text>
                  {selected === style.id ? (
                    <View style={[styles.badge, { backgroundColor: style.bg }]}>
                      <Text style={[styles.badgeText, { color: style.color }]}>Selected</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.tagline, { color: style.color }]}>{style.tagline}</Text>
              </View>
            </View>
            <Text style={styles.desc}>{style.desc}</Text>
            <Text style={styles.best}>Best for: {style.best}</Text>
          </TouchableOpacity>
        ))}

        {selectedStyle ? (
          <View style={[styles.preview, { borderColor: selectedStyle.color }]}>
            <Text style={styles.previewTitle}>
              Preview with ₹{Math.round(previewIncome).toLocaleString('en-IN')}
            </Text>
            {Object.entries(calculateBudgetLimits(previewIncome, selected))
              .filter(([, value]) => value > 0)
              .map(([category, amount]) => (
                <View key={category} style={styles.previewRow}>
                  <Text style={styles.previewCategory}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <Text style={styles.previewAmount}>₹{amount.toLocaleString('en-IN')}</Text>
                </View>
              ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: selectedStyle?.color || '#5B4FE8' }]}
          onPress={handleDone}>
          <Text style={styles.doneText}>Use this budget style</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F4FF' },
  hero: { padding: 24, alignItems: 'center' },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: '#6B6B8A',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, marginLeft: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  styleName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  tagline: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  desc: { fontSize: 13, color: '#1A1A2E', marginBottom: 4 },
  best: { fontSize: 12, color: '#6B6B8A' },
  preview: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E6FF',
  },
  previewCategory: { fontSize: 13, color: '#6B6B8A' },
  previewAmount: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  doneButton: {
    margin: 16,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
