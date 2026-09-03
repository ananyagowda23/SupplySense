import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getProducts } from '@/services/mockData';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function ProductsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const products = getProducts();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: theme.border }]}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Products Catalog</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {products.length} Active Enterprise SKUs
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {products.map((product) => (
          <View
            key={product.id}
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
              Shadows.card,
            ]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]}>{product.name}</Text>
                <Text style={[styles.sku, { color: theme.textMuted }]}>
                  {product.sku} • Category: {product.category}
                </Text>
              </View>
              <StatusBadge type="status" value={product.status} />
            </View>

            <View style={[styles.detailsBox, { backgroundColor: theme.surfaceSubtle }]}>
              <View style={styles.detailCol}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Price</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  ₹{product.price.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Unit Cost</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  ₹{product.cost.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Stock</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  {product.stockLevel} units
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Reorder</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  {product.reorderPoint} units
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.supplierText, { color: theme.textSecondary }]}>
                Supplier: {product.supplierName} ({product.leadTimeDays} days lead time)
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  sku: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  detailsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  detailCol: {
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 2,
  },
  detailVal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  cardFooter: {
    marginTop: 4,
  },
  supplierText: {
    fontSize: Typography.fontSizes.xs,
  },
});
