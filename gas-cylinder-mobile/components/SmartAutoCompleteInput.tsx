import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Keyboard,
  Dimensions,
} from 'react-native';
import { autoCompleteService, AutoCompleteSuggestion } from '../services/autoCompleteService';
import { feedbackService } from '../services/feedbackService';

const { width } = Dimensions.get('window');

interface SmartAutoCompleteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  type: 'customer' | 'location' | 'note' | 'barcode';
  placeholder?: string;
  style?: any;
  maxSuggestions?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
}

export default function SmartAutoCompleteInput({
  value,
  onChangeText,
  type,
  placeholder,
  style,
  maxSuggestions = 8,
  autoCapitalize = 'words',
  multiline = false,
  numberOfLines = 1,
  editable = true,
}: SmartAutoCompleteInputProps) {
  const [suggestions, setSuggestions] = useState<AutoCompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize auto-complete service
  useEffect(() => {
    autoCompleteService.initialize();
  }, []);

  // Handle text changes with debouncing
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (value.length >= 1) {
        loadSuggestions(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value]);

  // Load suggestions from auto-complete service
  const loadSuggestions = async (input: string) => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const results = await autoCompleteService.getSuggestions(type, input, maxSuggestions);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = async (suggestion: AutoCompleteSuggestion) => {
    onChangeText(suggestion.value);
    setShowSuggestions(false);
    
    // Add to auto-complete history
    await autoCompleteService.addItem(type, suggestion.value, suggestion.metadata);
    
    // Provide haptic feedback
    await feedbackService.quickAction('suggestion selected');
    
    // Dismiss keyboard for single-line inputs
    if (!multiline) {
      Keyboard.dismiss();
    }
  };

  // Handle input focus
  const handleFocus = () => {
    // Measure input position for suggestion dropdown
    inputRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setInputPosition({ x: pageX, y: pageY, width, height });
    });

    // Show recent suggestions if input is empty
    if (!value.trim()) {
      loadRecentSuggestions();
    }
  };

  // Load recent suggestions when input is focused but empty
  const loadRecentSuggestions = async () => {
    try {
      const recent = await autoCompleteService.getRecentItems(type, 5);
      const recentSuggestions: AutoCompleteSuggestion[] = recent.map((item, index) => ({
        value: item,
        score: 50 - index,
        source: 'recent',
      }));
      
      setSuggestions(recentSuggestions);
      setShowSuggestions(recentSuggestions.length > 0);
    } catch (error) {
      console.error('Error loading recent suggestions:', error);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  // Render suggestion item
  const renderSuggestion = ({ item }: { item: AutoCompleteSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => selectSuggestion(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionText}>{item.value}</Text>
        <View style={styles.suggestionMeta}>
          <Text style={[styles.sourceLabel, { color: getSourceColor(item.source) }]}>
            {getSourceIcon(item.source)} {item.source.toUpperCase()}
          </Text>
          {item.metadata?.customerType && (
            <Text style={styles.metadataText}>
              {item.metadata.customerType}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Get source color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'frequent': return '#10B981';
      case 'recent': return '#3B82F6';
      case 'database': return '#8B5CF6';
      case 'pattern': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'frequent': return '🔥';
      case 'recent': return '🕐';
      case 'database': return '💾';
      case 'pattern': return '🧠';
      default: return '💡';
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        style={[styles.input, style]}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
      />

      {/* Suggestions Dropdown */}
      <Modal
        visible={showSuggestions && suggestions.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        >
          <View
            style={[
              styles.suggestionsContainer,
              {
                top: inputPosition.y + inputPosition.height + 5,
                left: inputPosition.x,
                width: Math.max(inputPosition.width, 250),
              },
            ]}
          >
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `${item.value}_${index}`}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              maxToRenderPerBatch={5}
              windowSize={5}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingIndicator}>
          <Text style={styles.loadingText}>💭</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1F2937',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  suggestionsContainer: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 250,
    zIndex: 1000,
  },
  suggestionsList: {
    borderRadius: 8,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  metadataText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  loadingText: {
    fontSize: 16,
  },
});
