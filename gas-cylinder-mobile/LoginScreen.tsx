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
  Platform,
  ScrollView,
  Linking,
  Modal
} from 'react-native';
import { supabase } from './supabase';
import { ValidationSchemas } from './utils/validation';
import { useErrorHandler } from './hooks/useErrorHandler';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // TODO: Replace with your client ID

const translations = {
  en: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    rememberMe: 'Remember Me',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account? Sign In',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    enterName: 'Enter your name',
    name: 'Name',
    registrationSuccess: 'Registration successful! Please check your email to verify your account.',
    selectLanguage: 'Language',
  },
  es: {
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    rememberMe: 'Recuérdame',
    createAccount: 'Crear cuenta',
    alreadyHaveAccount: '¿Ya tienes una cuenta? Inicia sesión',
    terms: 'Términos de servicio',
    privacy: 'Política de privacidad',
    enterName: 'Ingresa tu nombre',
    name: 'Nombre',
    registrationSuccess: '¡Registro exitoso! Por favor revisa tu correo para verificar tu cuenta.',
    selectLanguage: 'Idioma',
  },
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { handleError, isLoading, withErrorHandling } = useErrorHandler();
  const [showPassword, setShowPassword] = useState(true); // Start with password visible
  const [rememberMe, setRememberMe] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const t = translations[language];
  const [registerModal, setRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    (async () => {
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
      // Check for biometric support
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(hasHardware);
      setBiometricAvailable(isEnrolled);
    })();
  }, []);

  const validateForm = (): boolean => {
    const emailValidation = ValidationSchemas.login.email(email);
    const passwordValidation = ValidationSchemas.login.password(password);
    
    setEmailError(emailValidation.errors[0] || '');
    setPasswordError(passwordValidation.errors[0] || '');
    
    return emailValidation.isValid && passwordValidation.isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    if (rememberMe) {
      await AsyncStorage.setItem('rememberedEmail', email);
      await SecureStore.setItemAsync('rememberedPassword', password);
    } else {
      await AsyncStorage.removeItem('rememberedEmail');
      await SecureStore.deleteItemAsync('rememberedPassword');
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      Alert.alert('Password Reset', 'A password reset email has been sent if the email exists.');
    } catch (err) {
      Alert.alert('Error', err.message);
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
      if (!savedEmail) {
        Alert.alert('No saved login', 'Please login with email and password first and enable Remember Me.');
        return;
      }
      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Fingerprint/FaceID',
        fallbackLabel: 'Enter Password',
      });
      if (biometricResult.success) {
        setEmail(savedEmail);
        setRememberMe(true);
        // Prompt for password (for security, we do not store password)
        Alert.alert('Enter Password', 'Please enter your password to complete login.', [
          {
            text: 'OK',
            onPress: () => {},
          },
        ]);
        // Optionally, you could store password securely with expo-secure-store, but for now, just pre-fill email
      }
    } catch (err) {
      Alert.alert('Biometric Login Failed', err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const provider = 'google';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
        },
      });
      if (error) throw error;
      // The user will be redirected back to the app after login
    } catch (err) {
      Alert.alert('Google Login Failed', err.message);
    }
    setSocialLoading(false);
  };

  const handleRegister = async () => {
    setRegisterError('');
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirm) {
      setRegisterError('All fields are required.');
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      setRegisterError('Passwords do not match.');
      return;
    }
    setRegisterLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: registerForm.email.trim(),
        password: registerForm.password,
        options: { data: { name: registerForm.name } },
      });
      if (error) throw error;
      Alert.alert(t.registrationSuccess);
      setRegisterModal(false);
      setRegisterForm({ name: '', email: '', password: '', confirm: '' });
    } catch (err) {
      setRegisterError(err.message);
    }
    setRegisterLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
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
            <Text style={styles.appTitle}>LessAnnoyingScan</Text>
            <Text style={styles.appSubtitle}>Gas Cylinder Management</Text>
            <Text style={styles.welcomeMessage}>Welcome back! Sign in to continue</Text>
          </View>

          {/* Social Login Options */}
          <View style={styles.socialSection}>
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={socialLoading}>
              <Ionicons name="logo-google" size={20} color="#ea4335" style={{ marginRight: 8 }} />
              <Text style={styles.googleButtonText}>
                {socialLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            {biometricSupported && biometricAvailable && rememberMe && email && (
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
                <Ionicons name="finger-print" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.biometricButtonText}>Use Biometric Login</Text>
              </TouchableOpacity>
            )}
          </View>

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

            {/* Sign Up Link */}
            <TouchableOpacity style={styles.signUpLink} onPress={() => setRegisterModal(true)}>
              <Text style={styles.signUpText}>
                Don't have an account? <Text style={styles.signUpTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Use the same credentials as the web app
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://yourdomain.com/terms')}>
                <Text style={styles.legalLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://yourdomain.com/privacy')}>
                <Text style={styles.legalLink}>Privacy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Registration Modal */}
        <Modal visible={registerModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Account</Text>
                <TouchableOpacity onPress={() => setRegisterModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={registerForm.name}
                    onChangeText={v => setRegisterForm(f => ({ ...f, name: v }))}
                    placeholder="Enter your full name"
                    autoCapitalize="words"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={registerForm.email}
                    onChangeText={v => setRegisterForm(f => ({ ...f, email: v }))}
                    placeholder="Enter your email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={registerForm.password}
                    onChangeText={v => setRegisterForm(f => ({ ...f, password: v }))}
                    placeholder="Create a password"
                    secureTextEntry
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={registerForm.confirm}
                    onChangeText={v => setRegisterForm(f => ({ ...f, confirm: v }))}
                    placeholder="Confirm your password"
                    secureTextEntry
                  />
                </View>
                
                {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
                
                <TouchableOpacity 
                  style={[styles.signInButton, registerLoading && styles.signInButtonDisabled]} 
                  onPress={handleRegister} 
                  disabled={registerLoading}
                >
                  <Text style={styles.signInButtonText}>
                    {registerLoading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    padding: 24,
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
    color: '#3B82F6',
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
  socialSection: {
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  googleButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#EFF6FF',
  },
  biometricButtonText: {
    color: '#3B82F6',
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
    borderColor: '#3B82F6',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
  },
  forgotText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#3B82F6',
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
  signUpLink: {
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signUpTextBold: {
    color: '#3B82F6',
    fontWeight: '600',
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
    color: '#3B82F6',
  },
  legalSeparator: {
    marginHorizontal: 8,
    color: '#9CA3AF',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  modalForm: {
    // No additional styles needed
  },
});
