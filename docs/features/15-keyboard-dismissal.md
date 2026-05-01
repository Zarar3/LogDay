# Keyboard Dismissal on Scroll

## What it does
Automatically hides the keyboard when the user scrolls the page, rather than leaving it up and obscuring content. Affects HomeScreen (goal input), LogActivityScreen (notes/duration fields), and any other scrollable screen with text inputs.

## Backend changes
None.

## Frontend changes
- `mobile/src/screens/HomeScreen.js` — `FlatList` keyboard props
- `mobile/src/screens/LogActivityScreen.js` — `ScrollView` keyboard props

## Step-by-step implementation

### 1. HomeScreen.js — FlatList

The FlatList already exists. Add two props:

```js
<FlatList
  data={showAllActs ? activities : activities.slice(0, 5)}
  keyExtractor={item => item.id}
  keyboardDismissMode="on-drag"        // ← dismisses as soon as drag starts
  keyboardShouldPersistTaps="handled"  // ← taps on non-input elements work normally
  // ...rest of existing props
/>
```

`keyboardDismissMode="on-drag"` is the most natural feel — keyboard slides away the moment the user starts scrolling.

### 2. LogActivityScreen.js — ScrollView

```js
<ScrollView
  style={[styles.container, { backgroundColor: pageBg }]}
  contentContainerStyle={styles.content}
  keyboardDismissMode="on-drag"
  keyboardShouldPersistTaps="handled">
  {/* ...existing content unchanged... */}
</ScrollView>
```

### 3. Any other ScrollView screen

Apply the same two props to any `ScrollView` that contains `TextInput` fields:
- `CommentsScreen.js` — comment input at the bottom
- `ConversationScreen.js` — message input

```js
keyboardDismissMode="on-drag"
keyboardShouldPersistTaps="handled"
```

### 4. Tap-outside-to-dismiss (optional bonus)

For screens without a scroll, wrap content in a `TouchableWithoutFeedback` that calls `Keyboard.dismiss()`:

```js
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
  <View style={{ flex: 1 }}>
    {/* screen content */}
  </View>
</TouchableWithoutFeedback>
```

## How to test
1. Open HomeScreen, tap the goal text input → keyboard appears.
2. Start scrolling up or down → keyboard dismisses smoothly.
3. Tap a goal toggle button while keyboard is up → keyboard dismisses, toggle fires (not swallowed).
4. Open LogActivityScreen, tap Notes field → keyboard appears.
5. Scroll → keyboard dismisses without the view jumping.
