import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

/**
 * Auto-Complete Service - Provides intelligent suggestions for customer names, locations, and other fields
 * Uses local storage for performance and learns from user input patterns
 */

export interface AutoCompleteItem {
  id: string;
  value: string;
  type: 'customer' | 'location' | 'note' | 'barcode';
  frequency: number;
  lastUsed: number;
  metadata?: {
    customerType?: string;
    coordinates?: { lat: number; lng: number };
    category?: string;
  };
}

export interface AutoCompleteSuggestion {
  value: string;
  score: number;
  source: 'recent' | 'frequent' | 'database' | 'pattern';
  metadata?: any;
}

class AutoCompleteService {
  private cache: Map<string, AutoCompleteItem[]> = new Map();
  private isInitialized = false;

  /**
   * Initialize the auto-complete service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadFromStorage();
      this.isInitialized = true;
      console.log('🧠 AutoCompleteService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AutoCompleteService:', error);
    }
  }

  /**
   * Load auto-complete data from local storage
   */
  private async loadFromStorage() {
    try {
      const keys = ['customers', 'locations', 'notes', 'barcodes'];
      
      for (const key of keys) {
        const stored = await AsyncStorage.getItem(`autocomplete_${key}`);
        if (stored) {
          const items: AutoCompleteItem[] = JSON.parse(stored);
          this.cache.set(key, items);
        } else {
          this.cache.set(key, []);
        }
      }
    } catch (error) {
      console.error('Error loading auto-complete data:', error);
    }
  }

  /**
   * Save auto-complete data to local storage
   */
  private async saveToStorage(type: string, items: AutoCompleteItem[]) {
    try {
      await AsyncStorage.setItem(`autocomplete_${type}`, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving auto-complete data:', error);
    }
  }

  /**
   * Add or update an auto-complete item
   */
  async addItem(type: 'customer' | 'location' | 'note' | 'barcode', value: string, metadata?: any) {
    if (!value.trim()) return;

    const items = this.cache.get(`${type}s`) || [];
    const now = Date.now();
    
    // Find existing item or create new one
    let existingItem = items.find(item => item.value.toLowerCase() === value.toLowerCase());
    
    if (existingItem) {
      existingItem.frequency += 1;
      existingItem.lastUsed = now;
      if (metadata) {
        existingItem.metadata = { ...existingItem.metadata, ...metadata };
      }
    } else {
      const newItem: AutoCompleteItem = {
        id: `${type}_${now}_${Math.random().toString(36).substr(2, 9)}`,
        value: value.trim(),
        type,
        frequency: 1,
        lastUsed: now,
        metadata,
      };
      items.push(newItem);
    }

    // Sort by frequency and recency (weighted score)
    items.sort((a, b) => {
      const scoreA = a.frequency * 0.7 + (a.lastUsed / 1000000) * 0.3;
      const scoreB = b.frequency * 0.7 + (b.lastUsed / 1000000) * 0.3;
      return scoreB - scoreA;
    });

    // Keep only top 100 items per type
    const trimmedItems = items.slice(0, 100);
    
    this.cache.set(`${type}s`, trimmedItems);
    await this.saveToStorage(`${type}s`, trimmedItems);
  }

  /**
   * Get auto-complete suggestions for a given input
   */
  async getSuggestions(
    type: 'customer' | 'location' | 'note' | 'barcode',
    input: string,
    limit: number = 10
  ): Promise<AutoCompleteSuggestion[]> {
    if (!input.trim()) return [];

    const suggestions: AutoCompleteSuggestion[] = [];
    const inputLower = input.toLowerCase().trim();

    // 1. Get suggestions from local cache (recent/frequent)
    const localSuggestions = await this.getLocalSuggestions(type, inputLower, limit);
    suggestions.push(...localSuggestions);

    // 2. Get suggestions from database (if online)
    const dbSuggestions = await this.getDatabaseSuggestions(type, inputLower, limit);
    suggestions.push(...dbSuggestions);

    // 3. Generate pattern-based suggestions
    const patternSuggestions = await this.getPatternSuggestions(type, inputLower, limit);
    suggestions.push(...patternSuggestions);

    // Remove duplicates and sort by score
    const uniqueSuggestions = this.deduplicateAndScore(suggestions, inputLower);

    return uniqueSuggestions.slice(0, limit);
  }

  /**
   * Get suggestions from local cache
   */
  private async getLocalSuggestions(
    type: 'customer' | 'location' | 'note' | 'barcode',
    input: string,
    limit: number
  ): Promise<AutoCompleteSuggestion[]> {
    const items = this.cache.get(`${type}s`) || [];
    const suggestions: AutoCompleteSuggestion[] = [];

    for (const item of items) {
      const valueLower = item.value.toLowerCase();
      
      // Exact match gets highest score
      if (valueLower === input) {
        suggestions.push({
          value: item.value,
          score: 100,
          source: item.frequency > 5 ? 'frequent' : 'recent',
          metadata: item.metadata,
        });
      }
      // Starts with input
      else if (valueLower.startsWith(input)) {
        const score = 80 + (item.frequency * 2) + (item.lastUsed > Date.now() - 86400000 ? 10 : 0);
        suggestions.push({
          value: item.value,
          score,
          source: item.frequency > 5 ? 'frequent' : 'recent',
          metadata: item.metadata,
        });
      }
      // Contains input
      else if (valueLower.includes(input)) {
        const score = 60 + item.frequency + (item.lastUsed > Date.now() - 86400000 ? 5 : 0);
        suggestions.push({
          value: item.value,
          score,
          source: item.frequency > 5 ? 'frequent' : 'recent',
          metadata: item.metadata,
        });
      }
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get suggestions from database
   */
  private async getDatabaseSuggestions(
    type: 'customer' | 'location' | 'note' | 'barcode',
    input: string,
    limit: number
  ): Promise<AutoCompleteSuggestion[]> {
    try {
      const suggestions: AutoCompleteSuggestion[] = [];

      switch (type) {
        case 'customer':
          const { data: customers } = await supabase
            .from('customers')
            .select('name, customer_type')
            .ilike('name', `%${input}%`)
            .limit(limit);

          if (customers) {
            suggestions.push(...customers.map(customer => ({
              value: customer.name,
              score: 70,
              source: 'database' as const,
              metadata: { customerType: customer.customer_type },
            })));
          }
          break;

        case 'location':
          // You might have a locations table or extract from bottles
          const { data: locations } = await supabase
            .from('bottles')
            .select('location')
            .not('location', 'is', null)
            .ilike('location', `%${input}%`)
            .limit(limit);

          if (locations) {
            const uniqueLocations = [...new Set(locations.map(l => l.location))];
            suggestions.push(...uniqueLocations.map(location => ({
              value: location,
              score: 65,
              source: 'database' as const,
            })));
          }
          break;

        case 'barcode':
          const { data: bottles } = await supabase
            .from('bottles')
            .select('barcode_number, asset_type')
            .ilike('barcode_number', `%${input}%`)
            .limit(limit);

          if (bottles) {
            suggestions.push(...bottles.map(bottle => ({
              value: bottle.barcode_number,
              score: 75,
              source: 'database' as const,
              metadata: { assetType: bottle.asset_type },
            })));
          }
          break;
      }

      return suggestions;
    } catch (error) {
      console.warn('Database suggestions failed:', error);
      return [];
    }
  }

  /**
   * Generate pattern-based suggestions
   */
  private async getPatternSuggestions(
    type: 'customer' | 'location' | 'note' | 'barcode',
    input: string,
    limit: number
  ): Promise<AutoCompleteSuggestion[]> {
    const suggestions: AutoCompleteSuggestion[] = [];

    switch (type) {
      case 'location':
        // Common location patterns
        const locationPatterns = [
          'WAREHOUSE', 'OFFICE', 'LOADING DOCK', 'STORAGE', 'TRUCK',
          'SASKATOON', 'REGINA', 'CALGARY', 'EDMONTON', 'VANCOUVER',
          'SHOP FLOOR', 'CUSTOMER SITE', 'DELIVERY ROUTE'
        ];
        
        for (const pattern of locationPatterns) {
          if (pattern.toLowerCase().includes(input) && pattern.toLowerCase() !== input) {
            suggestions.push({
              value: pattern,
              score: 40,
              source: 'pattern',
            });
          }
        }
        break;

      case 'barcode':
        // Generate barcode patterns based on input
        if (input.length >= 2) {
          const prefix = input.toUpperCase();
          const patterns = [
            `${prefix}001`, `${prefix}002`, `${prefix}003`,
            `${prefix}A01`, `${prefix}B01`, `${prefix}C01`,
          ];
          
          suggestions.push(...patterns.map(pattern => ({
            value: pattern,
            score: 30,
            source: 'pattern' as const,
          })));
        }
        break;

      case 'note':
        // Common note patterns
        const notePatterns = [
          'Delivered', 'Returned', 'Damaged', 'Empty', 'Full',
          'Needs inspection', 'Ready for pickup', 'In transit',
          'Customer requested', 'Emergency delivery'
        ];
        
        for (const pattern of notePatterns) {
          if (pattern.toLowerCase().includes(input)) {
            suggestions.push({
              value: pattern,
              score: 35,
              source: 'pattern',
            });
          }
        }
        break;
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Remove duplicates and sort by score
   */
  private deduplicateAndScore(suggestions: AutoCompleteSuggestion[], input: string): AutoCompleteSuggestion[] {
    const seen = new Set<string>();
    const unique: AutoCompleteSuggestion[] = [];

    for (const suggestion of suggestions) {
      const key = suggestion.value.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        
        // Boost score for exact matches and close matches
        if (key === input) {
          suggestion.score += 20;
        } else if (key.startsWith(input)) {
          suggestion.score += 10;
        }
        
        unique.push(suggestion);
      }
    }

    return unique.sort((a, b) => b.score - a.score);
  }

  /**
   * Get recent items of a specific type
   */
  async getRecentItems(type: 'customer' | 'location' | 'note' | 'barcode', limit: number = 10): Promise<string[]> {
    const items = this.cache.get(`${type}s`) || [];
    return items
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit)
      .map(item => item.value);
  }

  /**
   * Get most frequent items of a specific type
   */
  async getFrequentItems(type: 'customer' | 'location' | 'note' | 'barcode', limit: number = 10): Promise<string[]> {
    const items = this.cache.get(`${type}s`) || [];
    return items
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(item => item.value);
  }

  /**
   * Clear all auto-complete data
   */
  async clearAll() {
    try {
      const keys = ['customers', 'locations', 'notes', 'barcodes'];
      
      for (const key of keys) {
        await AsyncStorage.removeItem(`autocomplete_${key}`);
        this.cache.set(key, []);
      }
      
      console.log('🧠 Auto-complete data cleared');
    } catch (error) {
      console.error('Error clearing auto-complete data:', error);
    }
  }

  /**
   * Get statistics about auto-complete usage
   */
  getStats() {
    const stats = {
      customers: this.cache.get('customers')?.length || 0,
      locations: this.cache.get('locations')?.length || 0,
      notes: this.cache.get('notes')?.length || 0,
      barcodes: this.cache.get('barcodes')?.length || 0,
    };

    const values = Object.values(stats || {});
    return {
      ...stats,
      total: (values || []).reduce((sum, count) => sum + count, 0),
    };
  }
}

// Export singleton instance
export const autoCompleteService = new AutoCompleteService();
export default autoCompleteService;
