# Who's Active Today

## What it does
A horizontal strip of avatar circles at the top of the Home screen showing which friends have logged at least one activity today. Tapping an avatar navigates to that friend's profile. It's a social nudge that encourages logging and creates natural curiosity.

## Backend changes

### New route: `GET /api/friends/active-today`
Add to `backend/src/routes/friends.js`:

```js
// GET /api/friends/active-today  — friends who logged something today
router.get('/active-today', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
    select: { userAId: true, userBId: true },
  });
  const friendIds = friendships.map(f =>
    f.userAId === req.user.id ? f.userBId : f.userAId
  );

  if (friendIds.length === 0) return res.json([]);

  // Find friends with at least one activity today
  const active = await prisma.user.findMany({
    where: {
      id: { in: friendIds },
      activities: { some: { date: today } },
    },
    select: { id: true, username: true, avatarBase64: true },
  });

  res.json(active);
});
```

Register the route **before** the existing parameterized routes to avoid path conflicts. It already lives in `friends.js` so no changes to `app.js` are needed.

## Frontend changes
- `HomeScreen.js` — add strip component at the top of the ScrollView

## Step-by-step implementation

### 1. Fetch active friends in HomeScreen.js

Add to the existing `loadAll` (or alongside the goals fetch on focus):

```js
const [activeFriends, setActiveFriends] = useState([]);

async function loadActiveFriends() {
  try {
    const { data } = await api.get('/friends/active-today');
    setActiveFriends(data);
  } catch {}
}

// Call inside useFocusEffect / useEffect alongside other fetches
```

### 2. Avatar strip component (inline in HomeScreen.js)

```js
function ActiveStrip({ friends, onPress }) {
  const { accent, cardBg, textSecondary, border } = useTheme();
  if (friends.length === 0) return null;

  return (
    <View style={stripStyles.wrap}>
      <Text style={[stripStyles.label, { color: textSecondary }]}>Active today</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stripStyles.row}>
        {friends.map(f => (
          <TouchableOpacity key={f.id} style={stripStyles.item} onPress={() => onPress(f.id)}>
            {f.avatarBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${f.avatarBase64}` }}
                style={[stripStyles.avatar, { borderColor: accent }]}
              />
            ) : (
              <View style={[stripStyles.avatar, stripStyles.placeholder, { borderColor: accent, backgroundColor: cardBg }]}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
            )}
            {/* Green dot */}
            <View style={[stripStyles.dot, { borderColor: cardBg }]} />
            <Text style={[stripStyles.name, { color: textSecondary }]} numberOfLines={1}>
              {f.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const stripStyles = StyleSheet.create({
  wrap:        { marginBottom: 16 },
  label:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
                 textTransform: 'uppercase', marginBottom: 10 },
  row:         { gap: 16, paddingRight: 4 },
  item:        { alignItems: 'center', position: 'relative', width: 56 },
  avatar:      { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  dot:         { position: 'absolute', top: 36, right: 2,
                 width: 13, height: 13, borderRadius: 7,
                 backgroundColor: '#22c55e', borderWidth: 2 },
  name:        { fontSize: 10, fontWeight: '600', marginTop: 5,
                 textAlign: 'center', width: 56 },
});
```

### 3. Place it in the HomeScreen render

```js
// Inside the ScrollView, just below the greeting / streak header:
<ActiveStrip
  friends={activeFriends}
  onPress={(userId) => navigation.navigate('UserProfile', { userId })}
/>
```

### 4. Refresh on focus

```js
useFocusEffect(useCallback(() => {
  loadAll();
  loadActiveFriends();
}, []));
```

## How to test
1. Log an activity from Account A.
2. Log in as Account B (a friend of A).
3. Open Home — Account A's avatar should appear in the strip with a green dot.
4. Tap the avatar → navigates to Account A's profile.
5. If no friends have logged today, the strip is hidden entirely (returns null).
