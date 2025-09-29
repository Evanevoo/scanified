import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Linking
} from 'react-native';
import { Platform } from '../utils/platform';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

interface OrganizationJoinScreenProps {
  user: any;
  onJoinSuccess: () => void;
}

export default function OrganizationJoinScreen({ 
  user, 
  onJoinSuccess
}: OrganizationJoinScreenProps) {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [invite, setInvite] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [showOrgList, setShowOrgList] = useState(false);

  useEffect(() => {
    checkForPendingInvite();
    fetchAvailableOrganizations();
  }, []);

  const checkForPendingInvite = async () => {
    try {
      // Check for stored invite token from OAuth redirect
      const inviteToken = await AsyncStorage.getItem('pending_invite_token');
      if (inviteToken) {
        console.log('📧 Found pending invite token:', inviteToken);
        
        const { data: inviteData, error } = await supabase
          .from('organization_invites')
          .select(`
            *,
            organization:organizations(name, slug)
          `)
          .eq('token', inviteToken)
          .single();

        if (!error && inviteData && inviteData.email.toLowerCase() === user.email.toLowerCase()) {
          setInvite(inviteData);
          // Clear the stored token
          await AsyncStorage.removeItem('pending_invite_token');
        }
      }

      // Check for email domain match
      const domain = user.email.split('@')[1];
      if (domain) {
        const { data: matchingOrg } = await supabase
          .from('organizations')
          .select('id, name, domain')
          .eq('domain', domain)
          .single();

        if (matchingOrg) {
          Alert.alert(
            'Organization Found',
            `We found an organization matching your email domain (${domain}). Would you like to join ${matchingOrg.name}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Join', onPress: () => joinByDomain(matchingOrg.id) }
            ]
          );
        }
      }
    } catch (error) {
      console.warn('Error checking for pending invite:', error);
    } finally {
      setCheckingInvite(false);
    }
  };

  const fetchAvailableOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, subscription_status')
        .eq('is_active', true)
        .order('name');

      if (!error) {
        setOrganizations(data || []);
      }
    } catch (error) {
      console.warn('Error fetching organizations:', error);
    }
  };

  const handleAcceptInvite = async () => {
    if (!invite) return;
    
    setLoading(true);
    try {
      // Update user profile with organization and role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          role: invite.role,
          organization_id: invite.organization_id
        });

      if (profileError) throw profileError;

      // Accept the invite
      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', invite.token);

      if (acceptError) throw acceptError;

      Alert.alert(
        'Success!',
        `Welcome to ${invite.organization.name}!`,
        [{ text: 'Continue', onPress: onJoinSuccess }]
      );

    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (joinCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit join code.');
      return;
    }

    setLoading(true);
    try {
      // Use the join code via PostgreSQL function
      const { data, error } = await supabase
        .rpc('use_organization_join_code', {
          p_code: joinCode.trim(),
          p_used_by: user.id
        });

      if (error) throw error;

      const result = data[0];
      if (!result.success) {
        throw new Error(result.message);
      }

      // Create/update profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          role: 'user', // Default role for code-based joins
          organization_id: result.organization_id
        });

      if (profileError) throw profileError;

      // Get organization name for success message
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', result.organization_id)
        .single();

      Alert.alert(
        'Success!',
        `Welcome to ${orgData?.name || 'the organization'}!`,
        [{ text: 'Continue', onPress: onJoinSuccess }]
      );

    } catch (error) {
      console.error('Error joining organization:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinByDomain = async (organizationId: string) => {
    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          role: 'user',
          organization_id: organizationId
        });

      if (profileError) throw profileError;

      Alert.alert(
        'Success!',
        'You have been added to the organization!',
        [{ text: 'Continue', onPress: onJoinSuccess }]
      );

    } catch (error) {
      console.error('Error joining by domain:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatJoinCode = (text: string) => {
    // Only allow numbers, max 6 digits
    const cleaned = text.replace(/\D/g, '').substring(0, 6);
    setJoinCode(cleaned);
  };

  if (checkingInvite) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Checking for invitations...</Text>
      </View>
    );
  }

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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Connect to Organization</Text>
            <Text style={styles.subtitle}>
              You're signed in as {user?.email}. Now let's connect you to your organization.
            </Text>
          </View>

          {/* Invitation Card */}
          {invite && (
            <View style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <Ionicons name="mail" size={24} color="#10B981" />
                <Text style={styles.inviteTitle}>You Have an Invitation!</Text>
              </View>
              <Text style={styles.inviteText}>
                You've been invited to join <Text style={styles.orgName}>{invite.organization.name}</Text> as a <Text style={styles.roleName}>{invite.role}</Text>.
              </Text>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAcceptInvite}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.acceptButtonText}>Accept Invitation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Join Code Section */}
          <View style={styles.joinCodeCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="keypad" size={24} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Organization Code</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Enter the 6-digit code provided by your administrator.
            </Text>
            
            <View style={styles.codeInputContainer}>
              <TextInput
                style={styles.codeInput}
                value={joinCode}
                onChangeText={formatJoinCode}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={6}
                textAlign="center"
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.joinButton,
                joinCode.length !== 6 && styles.joinButtonDisabled
              ]}
              onPress={handleJoinByCode}
              disabled={loading || joinCode.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.joinButtonText}>Join Organization</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Browse Organizations */}
          <View style={styles.browseCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={24} color="#6B7280" />
              <Text style={styles.sectionTitle}>Browse Organizations</Text>
            </View>
            <Text style={styles.sectionDescription}>
              View available organizations (admin approval may be required).
            </Text>
            
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => setShowOrgList(true)}
            >
              <Ionicons name="list" size={20} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={styles.browseButtonText}>View Organizations</Text>
            </TouchableOpacity>
          </View>

          {/* Contact for Organization Creation */}
          <View style={styles.createCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="mail" size={24} color="#10B981" />
              <Text style={styles.sectionTitle}>Need a New Organization?</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Contact us to set up a new organization for your business.
            </Text>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => Linking.openURL('https://scanified.com/contact')}
            >
              <Ionicons name="mail" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.createButtonText}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          {/* Help Section */}
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>• Have an invite link? Click it to automatically join</Text>
            <Text style={styles.helpText}>• Need a join code? Ask your administrator for a 6-digit code</Text>
            <Text style={styles.helpText}>• Can't find your organization? Contact your administrator</Text>
          </View>
        </View>

        {/* Organizations List Modal */}
        <Modal
          visible={showOrgList}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Available Organizations</Text>
                <TouchableOpacity onPress={() => setShowOrgList(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.orgList}>
                {organizations.map((org) => (
                  <TouchableOpacity
                    key={org.id}
                    style={styles.orgItem}
                    onPress={() => {
                      Alert.alert(
                        'Join Organization',
                        `Would you like to request to join ${org.name}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Request to Join', onPress: () => joinByDomain(org.id) }
                        ]
                      );
                      setShowOrgList(false);
                    }}
                  >
                    <View>
                      <Text style={styles.orgName}>{org.name}</Text>
                      <Text style={styles.orgStatus}>{org.subscription_status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  inviteCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginLeft: 8,
  },
  inviteText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 22,
  },
  orgName: {
    fontWeight: 'bold',
  },
  roleName: {
    fontWeight: 'bold',
    color: '#10B981',
  },
  acceptButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinCodeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  browseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  codeInputContainer: {
    marginBottom: 16,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 8,
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  browseButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  browseButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  orgList: {
    maxHeight: 400,
  },
  orgItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orgStatus: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
});
