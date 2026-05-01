# Activity Type Icons on Cards

## What it does
Maps each activity type (Running, Gym, Reading, etc.) to a large emoji that appears prominently on the activity card. The feed becomes instantly scannable at a glance — you can recognise activity types without reading the text.

## Backend changes
None — all mapping is client-side.

## Frontend changes
- `mobile/src/screens/HomeScreen.js` — activity cards in the FlatList
- `mobile/src/screens/DiscoverScreen.js` — feed cards
- `mobile/src/utils/activityIcons.js` — new shared mapping file

## Step-by-step implementation

### 1. Create the icon mapping utility

```js
// mobile/src/utils/activityIcons.js

const ICONS = {
  Running:    '🏃',
  Walking:    '🚶',
  Gym:        '🏋️',
  Reading:    '📚',
  Cooking:    '🍳',
  Gaming:     '🎮',
  Studying:   '📖',
  Meditation: '🧘',
  Music:      '🎵',
  Art:        '🎨',
  Cycling:    '🚴',
  Swimming:   '🏊',
  Yoga:       '🤸',
  Hiking:     '🥾',
  Football:   '⚽',
  Basketball: '🏀',
  Tennis:     '🎾',
};

export function getActivityIcon(type) {
  if (!type) return '📋';
  // Exact match first
  if (ICONS[type]) return ICONS[type];
  // Case-insensitive fallback
  const key = Object.keys(ICONS).find(k => k.toLowerCase() === type.toLowerCase());
  return key ? ICONS[key] : '⭐';
}
```

`⭐` is the fallback for any custom activity type not in the map.

### 2. Update HomeScreen.js activity cards

Import the helper and add the icon to the card body:

```js
import { getActivityIcon } from '../utils/activityIcons';

// Inside renderItem, update cardBody:
<View style={styles.cardBody}>
  <Text style={styles.cardIcon}>{getActivityIcon(item.type)}</Text>
  <View style={styles.cardLeft}>
    <Text style={[styles.type, { color: textPrimary }]}>{item.type}</Text>
    {item.duration ? <Text style={[styles.meta, { color: accent }]}>⏱ {item.duration} min</Text> : null}
    {item.notes    ? <Text style={[styles.notes, { color: textSecondary }]}>📝 {item.notes}</Text> : null}
  </View>
  <TouchableOpacity onPress={() => confirmDelete(item.id)}>
    <Text style={styles.delete}>✕</Text>
  </TouchableOpacity>
</View>
```

Add to StyleSheet:
```js
cardIcon: { fontSize: 32, marginRight: 12 },
```

Update `cardBody` to align items properly:
```js
cardBody: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 8 },
```

### 3. Update DiscoverScreen.js feed cards

Same pattern — import `getActivityIcon` and add a large emoji to the left of the card text:

```js
import { getActivityIcon } from '../utils/activityIcons';

// In the activity card render:
<View style={styles.cardBody}>
  <Text style={styles.typeIcon}>{getActivityIcon(item.type)}</Text>
  <View style={{ flex: 1 }}>
    <Text style={[styles.type, { color: textPrimary }]}>{item.type}</Text>
    {/* ...rest of card... */}
  </View>
</View>
```

```js
typeIcon: { fontSize: 30, marginRight: 10 },
```

### 4. (Optional) Coloured icon background

Wrap the emoji in a tinted circle using the accent colour:

```js
<View style={[styles.iconBadge, { backgroundColor: accent + '18' }]}>
  <Text style={styles.cardIcon}>{getActivityIcon(item.type)}</Text>
</View>

// StyleSheet:
iconBadge: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center',
             alignItems: 'center', marginRight: 12 },
cardIcon:  { fontSize: 26 },
```

## How to test
1. Log activities of different types (Running, Gym, Reading).
2. On HomeScreen — each card shows the correct emoji on the left.
3. On Discover feed — same icons appear on other users' activity cards.
4. Log a custom activity type like "Boxing" → fallback ⭐ appears.
5. Add Boxing to the ICONS map → correct emoji appears after reload.
