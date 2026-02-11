import logger from './utils/logger';
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Linking
} from 'react-native';
import { Platform } from './utils/platform';
import { supabase } from './supabase';
import { ValidationSchemas } from './utils/validation';
import { useErrorHandler } from './hooks/useErrorHandler';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from './context/ThemeContext';

const translations = {
  en: {
    signIn: 'Sign In',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    rememberMe: 'Remember Me',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    enterName: 'Enter your name',
    name: 'Name',
    selectLanguage: 'Language',
  },
  es: {
    signIn: 'Iniciar sesión',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    rememberMe: 'Recuérdame',
    terms: 'Términos de servicio',
    privacy: 'Política de privacidad',
    enterName: 'Ingresa tu nombre',
    name: 'Nombre',
    selectLanguage: 'Idioma',
  },
};

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { handleError, isLoading, withErrorHandling } = useErrorHandler();
  const [showPassword, setShowPassword] = useState(false); // Start with password hidden
  const [rememberMe, setRememberMe] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const t = translations[language];

  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('rememberedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
        // Load password from SecureStore if Remember Me is checked
        const savedPassword = await SecureStore.getItemAsync('rememberedPassword');
        if (savedPassword) {
          setPassword(savedPassword);
        }
      } catch (error) {
        logger.warn('Error loading saved credentials:', error);
      }

      try {
        // Check for biometric support
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricSupported(hasHardware);
        setBiometricAvailable(isEnrolled);
      } catch (error) {
        logger.warn('Error checking biometric support:', error);
        setBiometricSupported(false);
        setBiometricAvailable(false);
      }
      
    })();
  }, []);

  const validateForm = (): boolean => {
    const emailValidation = ValidationSchemas.login.email(email);
    // Use simple validation for login - existing users may have weak passwords
    // Strong password validation is enforced on signup/password change
    const passwordValidation = ValidationSchemas.login.passwordSimple(password);
    
    setEmailError(emailValidation.errors[0] || '');
    setPasswordError(passwordValidation.errors[0] || '');
    
    return emailValidation.isValid && passwordValidation.isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    
    // Handle remember me functionality with error handling
    try {
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', email);
        await SecureStore.setItemAsync('rememberedPassword', password);
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
        try {
          await SecureStore.deleteItemAsync('rememberedPassword');
        } catch (error) {
          // SecureStore.deleteItemAsync can throw if key doesn't exist, which is fine
          logger.warn('Could not delete remembered password:', error);
        }
      }
    } catch (error) {
      logger.warn('Error managing saved credentials:', error);
      // Continue with login even if saving credentials fails
    }
    
    await withErrorHandling(async () => {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      if (error) {
        throw new Error(error.message);
      }
    }, 'Login Failed');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setEmailError('Please enter your email to reset password.');
      return;
    }
    setResetting(true);
    try {
      const redirectUrl = 'https://www.scanified.com/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      Alert.alert('Password Reset', 'A password reset email has been sent if the email exists. Check your inbox and spam folder.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to send reset email. Please try again or use the website to reset your password.';
      logger.error('Forgot password error:', err);
      Alert.alert('Error', message);
    }
    setResetting(false);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      const validation = ValidationSchemas.login.email(text);
      setEmailError(validation.errors[0] || '');
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      const validation = ValidationSchemas.login.password(text);
      setPasswordError(validation.errors[0] || '');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      const savedPassword = await SecureStore.getItemAsync('rememberedPassword');
      
      if (!savedEmail || !savedPassword) {
        Alert.alert('No saved login', 'Please login with email and password first and enable Remember Me.');
        return;
      }
      
      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Fingerprint/FaceID',
        fallbackLabel: 'Enter Password',
      });
      
      if (biometricResult.success) {
        // Set the saved credentials
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        
        // Automatically attempt login
        await withErrorHandling(async () => {
          const { error } = await supabase.auth.signInWithPassword({ 
            email: savedEmail.trim(), 
            password: savedPassword 
          });
          if (error) {
            throw new Error(error.message);
          }
        }, 'Biometric Login Failed');
      }
    } catch (err) {
      Alert.alert('Biometric Login Failed', err.message);
    }
  };



  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loginContainer}>
          {/* App Branding */}
          <View style={styles.brandingSection}>
            <Text style={styles.appTitle}>Scanified</Text>
            <Text style={styles.appSubtitle}>Asset Management Made Simple</Text>
            <Text style={styles.welcomeMessage}>Welcome back! Sign in to continue</Text>
          </View>

          {/* Biometric Login Option */}
          {biometricSupported && biometricAvailable && rememberMe && email && (
            <View style={styles.biometricSection}>
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
                <Ionicons name="finger-print" size={20} color="#40B5AD" style={{ marginRight: 8 }} />
                <Text style={styles.biometricButtonText}>Use Biometric Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, passwordError && styles.inputError]}
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                  textContentType="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(v => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Form Options */}
            <View style={styles.formOptions}>
              <TouchableOpacity style={styles.rememberMe} onPress={() => setRememberMe(v => !v)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleForgotPassword} disabled={resetting}>
                <Text style={styles.forgotText}>
                  {resetting ? 'Sending...' : 'Forgot password?'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Use the same credentials as the web app
            </Text>
            <Text style={styles.organizationText}>
              Need to create an organization? Contact us at{' '}
              <Text 
                style={styles.websiteLink}
                onPress={() => Linking.openURL('https://scanified.com/contact')}
              >
                scanified.com
              </Text>
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.scanified.com/terms')}>
                <Text style={styles.legalLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.scanified.com/privacy')}>
                <Text style={styles.legalLink}>Privacy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Platform.OS === 'ios' && Platform.isPad ? 48 : 24,
    maxWidth: Platform.OS === 'ios' && Platform.isPad ? 600 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  loginContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#40B5AD',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  welcomeMessage: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
  },
  biometricSection: {
    marginBottom: 24,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#40B5AD',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#E8F7F5',
  },
  biometricButtonText: {
    color: '#40B5AD',
    fontWeight: '600',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 14,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  formOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#40B5AD',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#40B5AD',
    borderColor: '#40B5AD',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
  },
  forgotText: {
    color: '#40B5AD',
    fontWeight: '600',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  signInButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLink: {
    fontSize: 12,
    color: '#40B5AD',
  },
  legalSeparator: {
    marginHorizontal: 8,
    color: '#9CA3AF',
    fontSize: 12,
  },
  organizationText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  websiteLink: {
    color: '#40B5AD',
    fontWeight: '600',
  },
});
