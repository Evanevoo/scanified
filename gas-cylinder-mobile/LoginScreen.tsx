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
      >
        <View style={styles.loginContainer}>
          {/* Language Selector */}
          <View style={styles.languageRow}>
            <Text style={styles.languageLabel}>{t.selectLanguage}:</Text>
            <TouchableOpacity onPress={() => setLanguage('en')} style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}><Text>EN</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setLanguage('es')} style={[styles.languageButton, language === 'es' && styles.languageButtonActive]}><Text>ES</Text></TouchableOpacity>
          </View>

          <Text style={styles.title}>Gas Cylinder App</Text>
          <Text style={styles.subtitle}>{t.signIn} {language === 'en' ? 'to your account' : 'en tu cuenta'}</Text>

          {/* Google Login Button */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={socialLoading}>
            <Ionicons name="logo-google" size={24} color="#ea4335" style={{ marginRight: 8 }} />
            <Text style={styles.googleButtonText}>{socialLoading ? 'Signing in...' : 'Sign in with Google'}</Text>
          </TouchableOpacity>

          {/* Biometric Login Button */}
          {biometricSupported && biometricAvailable && rememberMe && email ? (
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
              <Ionicons name="finger-print" size={24} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.biometricButtonText}>Login with Fingerprint/FaceID</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.formContainer}>
            <Text style={styles.label}>{t.email}</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError, { color: '#000000' }]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder={t.email}
              placeholderTextColor="#666666"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            
            <Text style={styles.label}>{t.password}</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[styles.input, passwordError && styles.inputError, { paddingRight: 48, color: '#000000' }]}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder={t.password}
                placeholderTextColor="#666666"
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!isLoading}
                textContentType="password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => {
                  console.log('Password visibility toggled:', !showPassword);
                  setShowPassword(v => !v);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <View style={styles.rowBetween}>
              <TouchableOpacity onPress={handleForgotPassword} disabled={resetting}>
                <Text style={styles.forgotText}>{resetting ? 'Sending...' : t.forgotPassword}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rememberMe} onPress={() => setRememberMe(v => !v)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </View>
                <Text style={styles.rememberMeText}>{t.rememberMe}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>{t.signIn}</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <TouchableOpacity style={styles.signUpLink} onPress={() => setRegisterModal(true)}>
              <Text style={styles.signUpText}>{t.createAccount}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://yourdomain.com/terms')}><Text style={styles.legalLink}>{t.terms}</Text></TouchableOpacity>
            <Text style={{ marginHorizontal: 8 }}>|</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://yourdomain.com/privacy')}><Text style={styles.legalLink}>{t.privacy}</Text></TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Use the same login credentials as the website
          </Text>
        </View>

        {/* Registration Modal */}
        <Modal visible={registerModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.title}>{t.signUp}</Text>
              <TextInput
                style={styles.input}
                value={registerForm.name}
                onChangeText={v => setRegisterForm(f => ({ ...f, name: v }))}
                placeholder={t.enterName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                value={registerForm.email}
                onChangeText={v => setRegisterForm(f => ({ ...f, email: v }))}
                placeholder={t.email}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                value={registerForm.password}
                onChangeText={v => setRegisterForm(f => ({ ...f, password: v }))}
                placeholder={t.password}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                value={registerForm.confirm}
                onChangeText={v => setRegisterForm(f => ({ ...f, confirm: v }))}
                placeholder={t.confirmPassword}
                secureTextEntry
              />
              {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
              <TouchableOpacity style={styles.loginButton} onPress={handleRegister} disabled={registerLoading}>
                <Text style={styles.loginButtonText}>{registerLoading ? '...' : t.signUp}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.signUpLink} onPress={() => setRegisterModal(false)}>
                <Text style={styles.signUpText}>{t.alreadyHaveAccount}</Text>
              </TouchableOpacity>
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
    padding: 20,
  },
  loginContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    color: '#000000',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginBottom: 12,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: 40,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 15,
    paddingVertical: 8,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2563eb',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  rememberMeText: {
    fontSize: 15,
    color: '#374151',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#F0F6FF',
  },
  biometricButtonText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ea4335',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  googleButtonText: {
    color: '#ea4335',
    fontWeight: 'bold',
    fontSize: 16,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  languageLabel: {
    fontSize: 15,
    marginRight: 8,
    color: '#374151',
  },
  languageButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginHorizontal: 2,
    backgroundColor: '#fff',
  },
  languageButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#fff',
  },
  signUpLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  signUpText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 15,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  legalLink: {
    color: '#2563eb',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
