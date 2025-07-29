# 📱 MOBILE APP SYNCHRONIZATION GUIDE

## Problem
The mobile app has hardcoded "Cylinder" terminology and needs to sync with the web app's dynamic asset configuration and branding.

## ✅ CURRENT STATUS

### What's Already Working
- ✅ **AssetContext** exists in mobile app (`gas-cylinder-mobile/context/AssetContext.tsx`)
- ✅ **Dynamic asset configuration** loading from organizations table
- ✅ **Asset provider** wrapping the entire app
- ✅ **Organization-based branding** (colors, app name, terminology)

### What Needs Updates
- ❌ **Screen titles** still hardcoded as "Cylinder" in many places
- ❌ **Navigation labels** not using dynamic terms
- ❌ **UI text** in screens still says "Gas Cylinder"
- ❌ **Service files** have hardcoded "cylinder" references

## 🔧 REQUIRED MOBILE APP UPDATES

### 1. Update Screen Components

Update these files to use `useAssetConfig()` hook:

#### A. ScanCylindersScreen.tsx
```typescript
import { useAssetConfig } from '../context/AssetContext';

export default function ScanCylindersScreen() {
  const { config } = useAssetConfig();
  
  return (
    <View>
      <Text>{config.assetDisplayName} Scanner</Text>
      <Text>Scan {config.assetDisplayNamePlural}</Text>
    </View>
  );
}
```

#### B. AddCylinderScreen.tsx → AddAssetScreen.tsx
```typescript
// Rename file and update component
export default function AddAssetScreen() {
  const { config } = useAssetConfig();
  
  return (
    <View>
      <Text>Add New {config.assetDisplayName}</Text>
    </View>
  );
}
```

#### C. EditCylinderScreen.tsx → EditAssetScreen.tsx
```typescript
export default function EditAssetScreen() {
  const { config } = useAssetConfig();
  
  return (
    <View>
      <Text>Edit {config.assetDisplayName}</Text>
    </View>
  );
}
```

#### D. LocateCylinderScreen.tsx → LocateAssetScreen.tsx
```typescript
export default function LocateAssetScreen() {
  const { config } = useAssetConfig();
  
  return (
    <Text>Locate {config.assetDisplayName}</Text>
  );
}
```

### 2. Update Navigation Stack

In `App.tsx`, update screen names to be dynamic:

```typescript
import { useAssetConfig } from './context/AssetContext';

function AppContent() {
  const { config } = useAssetConfig();
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ScanAssets" 
        component={ScanAssetsScreen}
        options={{ title: `Scan ${config.assetDisplayNamePlural}` }}
      />
      <Stack.Screen 
        name="AddAsset" 
        component={AddAssetScreen}
        options={{ title: `Add ${config.assetDisplayName}` }}
      />
      <Stack.Screen 
        name="EditAsset" 
        component={EditAssetScreen}
        options={{ title: `Edit ${config.assetDisplayName}` }}
      />
      <Stack.Screen 
        name="LocateAsset" 
        component={LocateAssetScreen}
        options={{ title: `Locate ${config.assetDisplayName}` }}
      />
    </Stack.Navigator>
  );
}
```

### 3. Update HomeScreen Actions

In `HomeScreen.tsx`, make menu items dynamic:

```typescript
export default function HomeScreen() {
  const { config } = useAssetConfig();
  
  const menuItems = [
    {
      title: `Scan ${config.assetDisplayNamePlural}`,
      icon: 'qr-code-scanner',
      action: 'ScanAssets',
    },
    {
      title: `Add ${config.assetDisplayName}`,
      icon: 'add-circle',
      action: 'AddAsset',
    },
    // ... etc
  ];
}
```

### 4. Update Service Files

#### A. CylinderLimitService.ts → AssetLimitService.ts
```typescript
export class AssetLimitService {
  static async canAddAssets(organizationId: string, quantity: number = 1) {
    // Update all "cylinder" references to "asset"
  }
}
```

#### B. Update SyncService.ts
```typescript
// Replace "cylinders" with "assets" in sync operations
```

## 🎨 BRANDING SYNCHRONIZATION

### App Name Synchronization
The mobile app already uses `config.appName` from the organization settings. Make sure your organization has:

```sql
UPDATE organizations 
SET app_name = 'Your Custom App Name'
WHERE id = 'your-org-id';
```

### Color Theme Synchronization
The mobile app uses `config.primaryColor` and `config.secondaryColor`. Update in web app:

1. **Go to** `/asset-configuration` in web app
2. **Update colors** in "Branding & Colors" tab
3. **Save configuration**
4. **Mobile app will sync** on next launch

### Custom Terminology
Update custom terminology in web app:

```sql
UPDATE organizations 
SET custom_terminology = '{
  "scan": "scan",
  "track": "monitor", 
  "inventory": "stock"
}'
WHERE id = 'your-org-id';
```

## 🚀 QUICK IMPLEMENTATION STEPS

### Step 1: Update App.tsx Navigation
```typescript
// Add this to App.tsx after line 100
const getScreenOptions = (title: string) => ({
  title: title.replace('Cylinder', config.assetDisplayName)
    .replace('Cylinders', config.assetDisplayNamePlural)
});
```

### Step 2: Create Asset Hook for Mobile
```typescript
// Create hooks/useAssetTerms.ts
export const useAssetTerms = () => {
  const { config } = useAssetConfig();
  
  return {
    asset: config.assetDisplayName,
    assets: config.assetDisplayNamePlural,
    assetLower: config.assetDisplayName.toLowerCase(),
    assetsLower: config.assetDisplayNamePlural.toLowerCase(),
  };
};
```

### Step 3: Update Critical Screens First
1. **HomeScreen.tsx** - Update menu items
2. **ScanCylindersScreen.tsx** - Update titles and labels
3. **App.tsx** - Update navigation titles

### Step 4: Test Synchronization
1. **Update organization config** in web app
2. **Restart mobile app**
3. **Verify branding changes** appear
4. **Test asset terminology** throughout app

## 📋 CHECKLIST

### Web App → Mobile Sync
- [ ] Organization asset_type updates mobile terminology
- [ ] Organization colors update mobile theme
- [ ] Organization app_name updates mobile app title
- [ ] Custom terminology syncs to mobile screens

### Mobile App Updates
- [ ] Replace "Cylinder" with dynamic terms in screens
- [ ] Update navigation titles to use asset config
- [ ] Update service file names and references
- [ ] Test all screens show correct terminology

### Testing
- [ ] Change asset type in web app `/asset-configuration`
- [ ] Restart mobile app
- [ ] Verify all screens show new terminology
- [ ] Test with different asset types (equipment, medical, etc.)

## 🔄 AUTOMATIC SYNC

The mobile app automatically syncs with web app configuration:
- **On app startup** - Loads latest organization config
- **AssetContext** fetches from `organizations` table
- **Real-time updates** when organization config changes

## 🆘 TROUBLESHOOTING

### Mobile App Not Syncing
1. **Check network connection**
2. **Verify organization_id** in user profile
3. **Check Supabase permissions** for mobile app
4. **Clear app cache** and restart

### Branding Not Updating
1. **Verify config saved** in web app
2. **Check organizations table** has correct values
3. **Restart mobile app** to force refresh
4. **Check AssetContext** is providing new values

This synchronization ensures your mobile and web apps maintain consistent branding and terminology! 📱✨ 