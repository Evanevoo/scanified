/**
 * Config plugin to address Google Play recommendations:
 * 1. Large screen support - Remove orientation/resizability restrictions
 * 2. Uses fullUser for screenOrientation (allows rotation on large screens)
 * 3. Ensures resizeableActivity for multi-window/large screen support
 */
const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

function withLargeScreenSupport(config) {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) return config;

    const mainActivity = mainApplication.activity?.find(
      (a) => a.$?.['android:name'] === '.MainActivity'
    );
    if (!mainActivity) return config;

    // fullUser: Respects user's rotation lock; allows all orientations on large screens
    // This satisfies "Remove resizability and orientation restrictions" for large screens
    mainActivity.$['android:screenOrientation'] = 'fullUser';

    // Explicitly enable resizable activity for large screens/foldables
    mainActivity.$['android:resizeableActivity'] = 'true';

    return config;
  });

  return config;
}

function withEdgeToEdgeFix(config) {
  return withGradleProperties(config, (config) => {
    // Remove deprecated expo.edgeToEdgeEnabled - edgeToEdgeEnabled is the correct property
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'expo.edgeToEdgeEnabled')
    );
    return config;
  });
}

module.exports = function withPlayStoreRecommendations(config) {
  config = withLargeScreenSupport(config);
  config = withEdgeToEdgeFix(config);
  return config;
};
