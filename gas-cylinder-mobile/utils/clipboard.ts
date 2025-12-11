import { Alert } from 'react-native';

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    // For React Native, we'll use a simple alert for now
    // In a real app, you'd use @react-native-clipboard/clipboard
    Alert.alert(
      'Debug Info Copied',
      'Debug information has been copied to clipboard.',
      [{ text: 'OK' }]
    );

    // TODO: Implement actual clipboard functionality when @react-native-clipboard/clipboard is added
    // import Clipboard from '@react-native-clipboard/clipboard';
    // await Clipboard.setString(text);
  } catch (error) {
    Alert.alert('Error', 'Failed to copy to clipboard');
  }
}; 