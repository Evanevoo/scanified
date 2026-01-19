import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SessionTimeoutWarningProps {
  visible: boolean;
  onExtendSession: () => void;
  onLogout: () => void;
  timeoutSeconds?: number;
}

export function SessionTimeoutWarning({
  visible,
  onExtendSession,
  onLogout,
  timeoutSeconds = 120,
}: SessionTimeoutWarningProps) {
  const { colors } = useTheme();
  const [countdown, setCountdown] = React.useState(timeoutSeconds);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Countdown timer
  React.useEffect(() => {
    if (!visible) {
      setCountdown(timeoutSeconds);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, timeoutSeconds, onLogout]);

  // Fade in animation
  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  // Format countdown
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: colors.surface, opacity: fadeAnim },
          ]}
        >
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>&#9888;</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Session Expiring Soon
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            You have been inactive for a while. For your security, you will be
            logged out in:
          </Text>

          {/* Countdown */}
          <View style={[styles.countdownContainer, { borderColor: colors.error }]}>
            <Text style={[styles.countdown, { color: colors.error }]}>
              {formatTime(countdown)}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.extendButton, { backgroundColor: colors.primary }]}
              onPress={onExtendSession}
              activeOpacity={0.8}
            >
              <Text style={styles.extendButtonText}>Stay Logged In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.logoutButton, { borderColor: colors.border }]}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <Text style={[styles.logoutButtonText, { color: colors.textSecondary }]}>
                Logout Now
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    color: '#F59E0B',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  countdownContainer: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 24,
  },
  countdown: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendButton: {
    backgroundColor: '#40B5AD',
  },
  extendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SessionTimeoutWarning;
