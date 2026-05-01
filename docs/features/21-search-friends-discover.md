# Search in Friends / Discover

## What it does
Adds a live search bar to the Friends and Discover screens. As the user types, results filter in real time — no "Search" button needed. On Friends, it searches your existing friends list locally. On Discover, it hits a backend endpoint to search all public users.

## Backend changes

### New route: `GET /api/discover/search?q=username`

Add to `backend/src/routes/discover.js`:

```js
// GET /api/discover/search?q=
router.get('/search', auth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      isPublic: true,
      username: { contains: q, mode: 'insensitive' },
      NOT: { id: req.user.id },
    },
    select: { id: true, username: true, avatarBase64: true },
    take: 20,
  });
  res.json(users);
});
```

Place this **before** any `/:id` param routes in discover.js.

## Frontend changes
- `mobile/src/screens/FriendsScreen.js` — local filter on existing friends list
- `mobile/src/screens/DiscoverScreen.js` — remote search with debounce

## Step-by-step implementation

### 1. FriendsScreen.js — local search

Add a search input and filter the `friends` array before rendering:

```js
import { TextInput } from 'react-native';
const [query, setQuery] = useState('');

// Filter in render:
const filteredFriends = query.trim()
  ? friends.filter(f => f.username.toLowerCase().includes(query.toLowerCase()))
  : friends;

// Search bar JSX (add above the friends list):
<TextInput
  style={[styles.searchInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
  placeholder="Search friends..."
  value={query}
  onChangeText={setQuery}
  placeholderTextColor={textSecondary}
  clearButtonMode="while-editing"
/>

// Render filteredFriends instead of friends
```

StyleSheet:
```js
searchInput: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14,
               paddingVertical: 10, fontSize: 14, marginBottom: 12 },
```

### 2. DiscoverScreen.js — remote search with debounce

```js
import { TextInput } from 'react-native';
const [query, setQuery]           = useState('');
const [searchResults, setResults] = useState([]);
const [searching, setSearching]   = useState(false);
const debounceTimer = useRef(null);

function onQueryChange(text) {
  setQuery(text);
  clearTimeout(debounceTimer.current);
  if (!text.trim() || text.trim().length < 2) {
    setResults([]);
    return;
  }
  debounceTimer.current = setTimeout(async () => {
    setSearching(true);
    try {
      const { data } = await api.get(`/discover/search?q=${encodeURIComponent(text.trim())}`);
      setResults(data);
    } catch {}
    setSearching(false);
  }, 300); // 300ms debounce
}

// In JSX, show search bar at the top and swap feed for results when query active:
<TextInput
  style={[styles.searchInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
  placeholder="Search people..."
  value={query}
  onChangeText={onQueryChange}
  placeholderTextColor={textSecondary}
  clearButtonMode="while-editing"
/>

{query.trim().length >= 2 ? (
  // Show search results
  <FlatList
    data={searchResults}
    keyExtractor={item => item.id}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={[styles.userRow, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}>
        {item.avatarBase64 ? (
          <Image source={{ uri: `data:image/jpeg;base64,${item.avatarBase64}` }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: border }]}>
            <Text>👤</Text>
          </View>
        )}
        <Text style={[styles.username, { color: textPrimary }]}>{item.username}</Text>
        <Text style={[styles.arrow, { color: accent }]}>→</Text>
      </TouchableOpacity>
    )}
    ListEmptyComponent={
      !searching ? <Text style={{ color: textSecondary, textAlign: 'center', marginTop: 20 }}>No users found</Text> : null
    }
  />
) : (
  // Normal feed FlatList (existing)
  <FlatList data={activities} ... />
)}
```

Add styles:
```js
searchInput:       { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14,
                     paddingVertical: 10, fontSize: 14, margin: 12 },
userRow:           { flexDirection: 'row', alignItems: 'center', gap: 12,
                     padding: 14, marginHorizontal: 12, marginBottom: 8,
                     borderRadius: 14, borderWidth: 1.5 },
avatar:            { width: 44, height: 44, borderRadius: 22 },
avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
username:          { flex: 1, fontSize: 15, fontWeight: '700' },
arrow:             { fontSize: 16, fontWeight: '700' },
```

## How to test
1. Open Friends tab → type a friend's name → list filters live.
2. Clear search → full list returns.
3. Open Discover tab → type a username → debounced API call fires after 300ms.
4. Results appear with avatars; tapping one navigates to UserProfile.
5. Type fewer than 2 chars → no API call, results cleared.
6. Test with no matches → "No users found" message shown.
