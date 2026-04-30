# Pull-to-Refresh

## What it does
Adds a pull-to-refresh gesture to the Feed (DiscoverScreen), Home, and Friends screens. The spinner tints to the user's accent color so it matches the theme. Pulling down reloads data from scratch with proper loading state so no stale content is shown.

## Backend changes
None — uses existing GET endpoints.

## Frontend changes
- `DiscoverScreen.js` — feed list
- `HomeScreen.js` — activities + goals list
- `FriendsScreen.js` — friends list / leaderboard

## Dependencies
`RefreshControl` is built into React Native — no install needed.

## Step-by-step implementation

### 1. The pattern (apply to every screen)

```js
import { FlatList, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Inside your component:
const { accent, pageBg } = useTheme();
const [refreshing, setRefreshing] = useState(false);

async function onRefresh() {
  setRefreshing(true);
  await loadFresh(); // your existing data-fetch function
  setRefreshing(false);
}
```

Add `refreshControl` prop to `FlatList` or `ScrollView`:

```js
// FlatList (DiscoverScreen):
<FlatList
  ...
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={accent}      // iOS spinner color
      colors={[accent]}        // Android spinner color
      progressBackgroundColor={pageBg}
    />
  }
/>

// ScrollView (HomeScreen, FriendsScreen):
<ScrollView
  ...
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={accent}
      colors={[accent]}
      progressBackgroundColor={pageBg}
    />
  }
/>
```

### 2. DiscoverScreen.js specifics

The existing `loadFresh` already resets `publicOffset.current = 0` and `setPosts([])`. Just wrap it:

```js
const [refreshing, setRefreshing] = useState(false);

async function onRefresh() {
  setRefreshing(true);
  await loadFresh();
  setRefreshing(false);
}
```

Pass `refreshControl` to the `FlatList`. Remove the manual "Loading..." header if refreshing handles the initial load.

### 3. HomeScreen.js specifics

```js
async function onRefresh() {
  setRefreshing(true);
  await Promise.all([loadActivities(), loadGoals(), loadActiveFriends()]);
  setRefreshing(false);
}
```

### 4. FriendsScreen.js specifics

```js
async function onRefresh() {
  setRefreshing(true);
  await loadFriends(); // existing fetch function
  setRefreshing(false);
}
```

### 5. Avoid double-loading

If your screen already shows a `loading` state for the initial fetch, guard against showing both indicators:

```js
// Only show the manual loading indicator on first mount, not on refresh
{loading && !refreshing && <ActivityIndicator color={accent} />}
```

## How to test
1. Open the Feed screen.
2. Pull down from the top → spinner appears in accent color.
3. Release → data reloads, new posts appear at top.
4. Pull while offline → spinner shows, then dismisses gracefully (error is swallowed by existing try/catch).
5. Verify the tab bar color matches the spinner on the pageBg background.
