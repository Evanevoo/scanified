import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { Platform } from '../utils/platform';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

interface ProofOfDeliveryProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (proof: ProofData) => void;
  customerInfo?: {
    id: string;
    name: string;
    address: string;
  };
  deliveryInfo?: {
    orderNumber: string;
    items: any[];
  };
}

interface ProofData {
  signature: string | null;
  photo: string | null;
  notes: string;
  timestamp: string;
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  customerName: string;
  customerSignature: boolean;
  deliveryConfirmed: boolean;
}

export default function ProofOfDelivery({
  visible,
  onClose,
  onComplete,
  customerInfo,
  deliveryInfo
}: ProofOfDeliveryProps) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [signature, setSignature] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [gpsLocation, setGpsLocation] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const signaturePaths = useRef<any[]>([]);
  const currentPath = useRef<any>(null);

  const steps = [
    { title: 'Customer Info', icon: '👤' },
    { title: 'Photo', icon: '📸' },
    { title: 'Signature', icon: '✍️' },
    { title: 'Notes', icon: '📝' },
    { title: 'Confirm', icon: '✅' }
  ];

  useEffect(() => {
    if (visible) {
      requestLocationPermission();
      getCurrentLocation();
    }
  }, [visible]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (locationPermission) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000
        });
        setGpsLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        exif: false
      });
      
      setPhoto(photo.uri);
      setShowCamera(false);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const clearSignature = () => {
    signaturePaths.current = [];
    setSignature(null);
  };

  const saveSignature = async () => {
    try {
      // Create SVG from paths
      const svg = createSVGFromPaths(signaturePaths.current);
      setSignature(svg);
      setShowSignature(false);
    } catch (error) {
      console.error('Signature error:', error);
      Alert.alert('Error', 'Failed to save signature');
    }
  };

  const createSVGFromPaths = (paths: any[]) => {
    // Convert Skia paths to SVG string
    let svgContent = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">`;
    
    paths.forEach(path => {
      const pathString = path.toSVGString();
      svgContent += `<path d="${pathString}" stroke="#000" stroke-width="2" fill="none"/>`;
    });
    
    svgContent += '</svg>';
    return svgContent;
  };

  const handleSignatureDraw = Gesture.Pan()
    .onStart((event) => {
      const path = Skia.Path.Make();
      path.moveTo(event.x, event.y);
      currentPath.current = path;
    })
    .onUpdate((event) => {
      if (currentPath.current) {
        currentPath.current.lineTo(event.x, event.y);
      }
    })
    .onEnd(() => {
      if (currentPath.current) {
        signaturePaths.current.push(currentPath.current);
        currentPath.current = null;
      }
    });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Upload photo to Supabase storage if exists
      let photoUrl = null;
      if (photo) {
        const photoResponse = await fetch(photo);
        const photoBlob = await photoResponse.blob();
        const fileName = `delivery-photos/${Date.now()}.jpg`;
        
        const { data: photoData, error: photoError } = await supabase.storage
          .from('delivery-attachments')
          .upload(fileName, photoBlob);
        
        if (!photoError) {
          photoUrl = photoData.path;
        }
      }

      // Create proof data
      const proofData: ProofData = {
        signature,
        photo: photoUrl,
        notes,
        timestamp: new Date().toISOString(),
        gpsLocation,
        customerName,
        customerSignature: !!signature,
        deliveryConfirmed: true
      };

      // Save to database
      const { error } = await supabase
        .from('delivery_proofs')
        .insert({
          customer_id: customerInfo?.id,
          order_number: deliveryInfo?.orderNumber,
          signature_data: signature,
          photo_url: photoUrl,
          notes,
          customer_name: customerName,
          gps_latitude: gpsLocation?.latitude,
          gps_longitude: gpsLocation?.longitude,
          gps_accuracy: gpsLocation?.accuracy,
          timestamp: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      onComplete(proofData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Proof of delivery error:', error);
      Alert.alert('Error', 'Failed to save proof of delivery');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setSignature(null);
    setPhoto(null);
    setNotes('');
    setCustomerName('');
    signaturePaths.current = [];
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Customer Information
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                color: colors.text 
              }]}
              placeholder="Customer Name"
              placeholderTextColor={colors.textSecondary}
              value={customerName}
              onChangeText={setCustomerName}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Delivery Address: {customerInfo?.address}
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Order Number: {deliveryInfo?.orderNumber}
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Items: {deliveryInfo?.items?.length || 0} cylinders
            </Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Take Delivery Photo
            </Text>
            {photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.retakeButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowCamera(true)}
                >
                  <Text style={styles.buttonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.cameraButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCamera(true)}
              >
                <Text style={styles.buttonText}>📸 Take Photo</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Take a photo of the delivered cylinders at the customer location
            </Text>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Customer Signature
            </Text>
            {signature ? (
              <View style={styles.signatureContainer}>
                <View style={styles.signaturePreview}>
                  <Text style={[styles.signatureText, { color: colors.text }]}>
                    Signature Captured ✓
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.retakeButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowSignature(true)}
                >
                  <Text style={styles.buttonText}>Retake Signature</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.signatureButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowSignature(true)}
              >
                <Text style={styles.buttonText}>✍️ Get Signature</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Have the customer sign to confirm delivery
            </Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Delivery Notes
            </Text>
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                color: colors.text 
              }]}
              placeholder="Add any delivery notes, special instructions, or observations..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Optional: Add any relevant notes about the delivery
            </Text>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Confirm Delivery
            </Text>
            <View style={styles.confirmationList}>
              <View style={styles.confirmationItem}>
                <Text style={[styles.confirmationLabel, { color: colors.text }]}>
                  Customer: {customerName || 'Not provided'}
                </Text>
                <Text style={[styles.confirmationStatus, { 
                  color: customerName ? colors.success : colors.warning 
                }]}>
                  {customerName ? '✓' : '⚠️'}
                </Text>
              </View>
              <View style={styles.confirmationItem}>
                <Text style={[styles.confirmationLabel, { color: colors.text }]}>
                  Photo: {photo ? 'Captured' : 'Not taken'}
                </Text>
                <Text style={[styles.confirmationStatus, { 
                  color: photo ? colors.success : colors.warning 
                }]}>
                  {photo ? '✓' : '⚠️'}
                </Text>
              </View>
              <View style={styles.confirmationItem}>
                <Text style={[styles.confirmationLabel, { color: colors.text }]}>
                  Signature: {signature ? 'Captured' : 'Not provided'}
                </Text>
                <Text style={[styles.confirmationStatus, { 
                  color: signature ? colors.success : colors.warning 
                }]}>
                  {signature ? '✓' : '⚠️'}
                </Text>
              </View>
              <View style={styles.confirmationItem}>
                <Text style={[styles.confirmationLabel, { color: colors.text }]}>
                  GPS Location: {gpsLocation ? 'Captured' : 'Not available'}
                </Text>
                <Text style={[styles.confirmationStatus, { 
                  color: gpsLocation ? colors.success : colors.warning 
                }]}>
                  {gpsLocation ? '✓' : '⚠️'}
                </Text>
              </View>
              <View style={styles.confirmationItem}>
                <Text style={[styles.confirmationLabel, { color: colors.text }]}>
                  Notes: {notes ? 'Added' : 'None'}
                </Text>
                <Text style={[styles.confirmationStatus, { 
                  color: notes ? colors.success : colors.textSecondary 
                }]}>
                  {notes ? '✓' : '-'}
                </Text>
              </View>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Review and confirm all delivery details
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancelButton, { color: colors.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Proof of Delivery
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                {
                  backgroundColor: index <= currentStep ? colors.primary : colors.border,
                }
              ]}>
                <Text style={[
                  styles.stepIcon,
                  { color: index <= currentStep ? colors.surface : colors.textSecondary }
                ]}>
                  {step.icon}
                </Text>
              </View>
              <Text style={[
                styles.stepLabel,
                { color: index <= currentStep ? colors.primary : colors.textSecondary }
              ]}>
                {step.title}
              </Text>
            </View>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {renderStepContent()}
        </ScrollView>

        {/* Navigation */}
        <View style={[styles.navigation, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: currentStep > 0 ? colors.border : 'transparent' }
            ]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <Text style={[
              styles.navButtonText,
              { color: currentStep > 0 ? colors.text : colors.textSecondary }
            ]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: colors.primary }
            ]}
            onPress={currentStep === steps.length - 1 ? handleComplete : handleNext}
            disabled={isLoading}
          >
            <Text style={[styles.navButtonText, { color: colors.surface }]}>
              {isLoading ? 'Saving...' : currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.cameraContainer}>
          {cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              barcodeScannerEnabled={true}
            >
              <View style={styles.cameraOverlay}>
                <TouchableOpacity
                  style={styles.closeCamera}
                  onPress={() => setShowCamera(false)}
                >
                  <Text style={styles.closeCameraText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePhoto}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>
                Camera permission is required to take photos
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestCameraPermission}
              >
                <Text style={styles.permissionButtonText}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Signature Modal */}
      <Modal
        visible={showSignature}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.signatureModal, { backgroundColor: colors.background }]}>
          <View style={[styles.signatureHeader, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setShowSignature(false)}>
              <Text style={[styles.cancelButton, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Customer Signature
            </Text>
            <TouchableOpacity onPress={clearSignature}>
              <Text style={[styles.clearButton, { color: colors.error }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signatureArea}>
            <GestureDetector gesture={handleSignatureDraw}>
              <Canvas style={styles.signatureCanvas}>
                {signaturePaths.current.map((path, index) => (
                  <Path
                    key={index}
                    path={path}
                    color="#000"
                    strokeWidth={2}
                    style="stroke"
                  />
                ))}
              </Canvas>
            </GestureDetector>
            <Text style={[styles.signatureInstructions, { color: colors.textSecondary }]}>
              Have the customer sign above to confirm delivery
            </Text>
          </View>

          <View style={[styles.signatureFooter, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.saveSignatureButton, { backgroundColor: colors.primary }]}
              onPress={saveSignature}
            >
              <Text style={[styles.saveSignatureButtonText, { color: colors.surface }]}>
                Save Signature
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepIcon: {
    fontSize: 16,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContent: {
    paddingVertical: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 120,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  cameraButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  signatureButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  retakeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  signatureContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  signaturePreview: {
    width: 200,
    height: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signatureText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmationList: {
    marginBottom: 16,
  },
  confirmationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  confirmationLabel: {
    fontSize: 16,
  },
  confirmationStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  closeCamera: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCameraText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cameraControls: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signatureModal: {
    flex: 1,
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  clearButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  signatureArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  signatureCanvas: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginVertical: 16,
  },
  signatureInstructions: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  signatureFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveSignatureButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveSignatureButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 