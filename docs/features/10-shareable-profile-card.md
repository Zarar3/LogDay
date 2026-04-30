# Shareable Profile Card

## What it does
Lets users export their profile card as an image (PNG) and share it via the native share sheet. The exported image is pixel-perfect — same card the user sees on the Profile screen, captured via `react-native-view-shot`. People share these on Instagram and other apps, driving organic growth.

## Backend changes
None — this is entirely client-side rendering and native sharing.

## Frontend changes
- `ProfileScreen.js` — add a ref to the card `View`, add a Share button

## Dependencies

```bash
npx expo install react-native-view-shot expo-sharing
```

Both work in Expo Go and in production builds.

## Step-by-step implementation

### 1. Import libraries

In `ProfileScreen.js`:

```js
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
```

### 2. Add a ref to the card

```js
const cardRef = useRef(null);
```

Wrap the existing card `View` with `ViewShot`:

```js
<ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }}>
  <View style={[styles.card, { borderColor: primary, backgroundColor: secondary }]}>
    {/* ... all existing card content unchanged ... */}
  </View>
</ViewShot>
```

### 3. Share function

```js
async function shareCard() {
  try {
    const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your LogDay card',
      });
    } else {
      Alert.alert('Not supported', 'Sharing is not available on this device.');
    }
  } catch (e) {
    Alert.alert('Error', 'Could not capture card.');
  }
}
```

### 4. Add Share button to the Profile screen

Place it just below the card, before the color pickers:

```js
<TouchableOpacity
  style={[shareStyles.btn, { backgroundColor: primary }]}
  onPress={shareCard}
  activeOpacity={0.8}>
  <Text style={shareStyles.btnText}>📤  Share My Card</Text>
</TouchableOpacity>

const shareStyles = StyleSheet.create({
  btn:     { marginTop: 16, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28,
             alignSelf: 'center', flexDirection: 'row', gap: 8,
             shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
             shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
```

### 5. Ensure the card renders off-screen elements correctly

`react-native-view-shot` captures what's rendered on screen. If the card scrolls off view, the capture may be blank. Use `collapsable={false}` on the `ViewShot` wrapper to force the native view to stay in memory:

```js
<ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }} collapsable={false}>
```

### 6. Add a watermark to the captured image (optional)

Inside the `ViewShot` wrapper, add a small branding footer that's only visible in exports (overlay it transparently when not sharing, or just always show it):

```js
<View style={shareStyles.watermark}>
  <Text style={shareStyles.watermarkText}>LogDay</Text>
</View>

const shareStyles = StyleSheet.create({
  // ...
  watermark:     { alignItems: 'center', paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.08)' },
  watermarkText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 2 },
});
```

## How to test
1. Open Profile screen.
2. Tap "Share My Card".
3. Native share sheet appears with the card as a PNG attachment.
4. Share to Photos app → image saved correctly.
5. Verify the image shows the correct colors, avatar, stats, and streak.
6. Test with a very long username — card should still render cleanly.
7. Test in dark mode — card colors export correctly.

## Notes
- `captureRef` works on both iOS and Android.
- On Android, the `Sharing.shareAsync` dialog shows app choices (WhatsApp, Instagram, etc.).
- On iOS it shows the standard share sheet with AirDrop, Messages, Save Image, etc.
- The image resolution matches the device's pixel density (retina quality on modern iPhones).
