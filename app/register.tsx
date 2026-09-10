import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { register, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (!password.trim() || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return false;
    }
    if (!orgName.trim()) {
      setErrorMessage('Please enter your company / organization name.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: email.trim(),
        password: password.trim(),
        full_name: fullName.trim(),
        organization_name: orgName.trim(),
      });
      // Navigation is automatically handled by root layout AuthGuard
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Registration failed. Please check your information and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Branding */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoCircle, { backgroundColor: theme.darkTeal }]}>
              <MaterialIcons name="domain-add" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.brandTitle, { color: theme.darkTeal }]}>SupplySense</Text>
            <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>
              Create Enterprise Tenant & Admin Account
            </Text>
          </View>

          {/* Registration Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
              Shadows.card,
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>Register Organization</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Set up your isolated multi-tenant supply chain workspace
            </Text>

            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder },
                ]}
              >
                <MaterialIcons name="error-outline" size={18} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Full Name Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                ]}
              >
                <MaterialIcons name="person" size={20} color={theme.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="Ananya Sharma"
                  placeholderTextColor={theme.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Work Email</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                ]}
              >
                <MaterialIcons name="email" size={20} color={theme.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="admin@company.com"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                ]}
              >
                <MaterialIcons name="lock" size={20} color={theme.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Organization Name Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Company / Organization Name
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                ]}
              >
                <MaterialIcons name="business" size={20} color={theme.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="Acme Global Logistics"
                  placeholderTextColor={theme.textMuted}
                  value={orgName}
                  onChangeText={setOrgName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Submit Register Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: theme.primary },
                isLoading && styles.disabledBtn,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create Organization Workspace</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link to Login */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Already have an enterprise account?
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/login' as any)}
              disabled={isLoading}
            >
              <Text style={[styles.loginLink, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  brandTitle: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.sm + 2,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },
  cardSubtitle: {
    fontSize: Typography.fontSizes.xs,
    marginTop: -Spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
  },
  submitBtn: {
    flexDirection: 'row',
    height: 46,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.fontSizes.xs,
  },
  loginLink: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
});
