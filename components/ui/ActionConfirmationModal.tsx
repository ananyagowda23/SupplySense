import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PrimaryButton } from './PrimaryButton';

import { ActionType } from '@/types/supplyChain';

interface ActionConfirmationModalProps {
  visible: boolean;
  actionType: ActionType | null;
  productName: string;
  sku: string;
  defaultQuantity?: number;
  onClose: () => void;
}

export function ActionConfirmationModal({
  visible,
  actionType,
  productName,
  sku,
  defaultQuantity = 250,
  onClose,
}: ActionConfirmationModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!actionType) return null;

  const actionTitle =
    actionType === 'ORDER'
      ? 'Order Stock'
      : actionType === 'TRANSFER'
      ? 'Transfer Inventory'
      : 'Expedite PO Shipment';

  const actionIcon =
    actionType === 'ORDER'
      ? 'add-shopping-cart'
      : actionType === 'TRANSFER'
      ? 'swap-horiz'
      : 'speed';

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1200);
  };

  const handleDismiss = () => {
    setIsSuccess(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {!isSuccess ? (
            <>
              <View style={styles.header}>
                <View style={[styles.iconBg, { backgroundColor: theme.primaryLight }]}>
                  <MaterialIcons name={actionIcon} size={24} color={theme.primary} />
                </View>
                <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>{actionTitle}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {productName} ({sku})
              </Text>

              <View style={[styles.detailsBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Action:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{actionTitle}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Quantity:</Text>
                  <Text style={[styles.detailValue, { color: theme.primary }]}>{defaultQuantity} units</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Environment:</Text>
                  <Text style={[styles.detailValue, { color: theme.success }]}>Local Mock Action</Text>
                </View>
              </View>

              <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                This mock interaction simulates sending an operation request to the supply chain pipeline.
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: theme.border }]}
                  onPress={handleDismiss}
                  disabled={isLoading}>
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <PrimaryButton
                    title={isLoading ? 'Processing...' : 'Confirm Action'}
                    onPress={handleConfirm}
                    disabled={isLoading}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={[styles.successIconBg, { backgroundColor: theme.successBg }]}>
                <MaterialIcons name="check-circle" size={48} color={theme.success} />
              </View>

              <Text style={[styles.successTitle, { color: theme.text }]}>Action Submitted!</Text>
              <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
                Mock request for {actionTitle} ({defaultQuantity} units of {productName}) has been processed successfully.
              </Text>

              <PrimaryButton title="Done" onPress={handleDismiss} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    marginBottom: Spacing.md,
  },
  detailsBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    fontSize: Typography.fontSizes.xs,
  },
  detailValue: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  noteText: {
    fontSize: Typography.fontSizes.xs,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  successIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
});
