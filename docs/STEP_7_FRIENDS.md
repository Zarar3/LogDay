# Step 7 — Friends & Daily Comparison

## Goal
Add friend requests, a friends list, and a side-by-side screen to compare your daily activities with a friend's.

---

## 7.1 Friends Routes (Backend)

Open `backend/src/routes/friends.js` and replace it with:

```js
const router = require('express').Router();
const prisma = require('../prisma');
const auth   = require('../middleware/auth');

// POST /api/friends/request  — send a friend request by username
router.post('/request', auth, async (req, res) => {
  const { username } = req.body;

  const receiver = await prisma.user.findUnique({ where: { username } });
  if (!receiver)            return res.status(404).json({ error: 'User not found' });
  if (receiver.id === req.user.id)
                            return res.status(400).json({ error: 'Cannot add yourself' });

  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: req.user.id, receiverId: receiver.id },
        { senderId: receiver.id, receiverId: req.user.id },
      ],
    },
  });
  if (existing) return res.status(409).json({ error: 'Request already exists' });

  const request = await prisma.friendRequest.create({
    data: { senderId: req.user.id, receiverId: receiver.id },
  });
  res.status(201).json(request);
});

// GET /api/friends/requests  — incoming pending requests
router.get('/requests', auth, async (req, res) => {
  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: req.user.id, status: 'pending' },
    include: { sender: { select: { id: true, username: true } } },
  });
  res.json(requests);
});

// POST /api/friends/requests/:id/accept
router.post('/requests/:id/accept', auth, async (req, res) => {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.receiverId !== req.user.id)
    return res.status(404).json({ error: 'Request not found' });

  await prisma.friendRequest.update({ where: { id: req.params.id }, data: { status: 'accepted' } });

  // Create friendship (store with smaller id first to keep unique)
  const [userAId, userBId] = [request.senderId, request.receiverId].sort();
  await prisma.friendship.create({ data: { userAId, userBId } });

  res.json({ success: true });
});

// POST /api/friends/requests/:id/reject
router.post('/requests/:id/reject', auth, async (req, res) => {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.receiverId !== req.user.id)
    return res.status(404).json({ error: 'Request not found' });

  await prisma.friendRequest.update({ where: { id: req.params.id }, data: { status: 'rejected' } });
  res.json({ success: true });
});

// GET /api/friends  — your friends list
router.get('/', auth, async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: req.user.id }, { userBId: req.user.id }],
    },
    include: {
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } },
    },
  });

  const friends = friendships.map(f =>
    f.userAId === req.user.id ? f.userB : f.userA
  );
  res.json(friends);
});

module.exports = router;
```

---

## 7.2 Friends Screen (Mobile)

Create `mobile/src/screens/FriendsScreen.js`:

```jsx
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';

export default function FriendsScreen({ navigation }) {
  const [friends, setFriends]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [username, setUsername] = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const [f, r] = await Promise.all([
      api.get('/friends'),
      api.get('/friends/requests'),
    ]);
    setFriends(f.data);
    setRequests(r.data);
  }

  async function sendRequest() {
    if (!username.trim()) return;
    try {
      await api.post('/friends/request', { username: username.trim() });
      Alert.alert('Sent!', `Friend request sent to ${username}`);
      setUsername('');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not send request');
    }
  }

  async function acceptRequest(id) {
    await api.post(`/friends/requests/${id}/accept`);
    loadData();
  }

  async function rejectRequest(id) {
    await api.post(`/friends/requests/${id}/reject`);
    loadData();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Friends</Text>

      {/* Add friend */}
      <View style={styles.row}>
        <TextInput style={styles.input} placeholder="Add by username"
          value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TouchableOpacity style={styles.addBtn} onPress={sendRequest}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Pending requests */}
      {requests.length > 0 && (
        <>
          <Text style={styles.section}>Pending Requests</Text>
          {requests.map(r => (
            <View key={r.id} style={styles.requestCard}>
              <Text style={styles.requestName}>{r.sender.username}</Text>
              <TouchableOpacity onPress={() => acceptRequest(r.id)} style={styles.acceptBtn}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => rejectRequest(r.id)}>
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Friends list */}
      <Text style={styles.section}>Your Friends</Text>
      <FlatList
        data={friends}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No friends yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.friendCard}
            onPress={() => navigation.navigate('Compare', { friend: item })}>
            <Text style={styles.friendName}>{item.username}</Text>
            <Text style={styles.compareText}>Compare →</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  heading:     { fontSize: 28, fontWeight: 'bold', marginTop: 40, marginBottom: 16 },
  row:         { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input:       { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  addBtn:      { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText:  { color: '#fff', fontWeight: '600' },
  section:     { fontWeight: '700', fontSize: 15, marginTop: 20, marginBottom: 8, color: '#555' },
  requestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                 borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  requestName: { flex: 1, fontWeight: '600' },
  acceptBtn:   { backgroundColor: '#4F46E5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  acceptText:  { color: '#fff', fontWeight: '600' },
  rejectText:  { color: '#f00' },
  friendCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                 borderRadius: 10, padding: 14, marginBottom: 8 },
  friendName:  { flex: 1, fontSize: 16, fontWeight: '600' },
  compareText: { color: '#4F46E5' },
  empty:       { textAlign: 'center', color: '#aaa', marginTop: 30 },
});
```

---

## 7.3 Compare Screen (Mobile)

Create `mobile/src/screens/CompareScreen.js`:

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import api from '../api';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function CompareScreen({ route }) {
  const { friend } = route.params;
  const [mine, setMine]           = useState([]);
  const [theirs, setTheirs]       = useState([]);
  const date = todayDate();

  useEffect(() => {
    const d = `?date=${date}`;
    Promise.all([
      api.get(`/activities${d}`),
      api.get(`/activities/user/${friend.id}${d}`),
    ]).then(([m, t]) => {
      setMine(m.data);
      setTheirs(t.data);
    });
  }, []);

  function ActivityList({ items }) {
    if (!items.length) return <Text style={styles.empty}>Nothing logged yet.</Text>;
    return items.map(a => (
      <View key={a.id} style={styles.card}>
        <Text style={styles.type}>{a.type}</Text>
        {a.duration ? <Text style={styles.meta}>{a.duration} min</Text> : null}
        {a.notes    ? <Text style={styles.notes}>{a.notes}</Text>        : null}
      </View>
    ));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Today vs {friend.username}</Text>
      <Text style={styles.date}>{date}</Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.colHeader}>You</Text>
          <ActivityList items={mine} />
        </View>
        <View style={styles.divider} />
        <View style={styles.column}>
          <Text style={styles.colHeader}>{friend.username}</Text>
          <ActivityList items={theirs} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  content:   { padding: 20 },
  heading:   { fontSize: 24, fontWeight: 'bold', marginTop: 40 },
  date:      { color: '#888', marginBottom: 20 },
  columns:   { flexDirection: 'row' },
  column:    { flex: 1 },
  divider:   { width: 1, backgroundColor: '#ddd', marginHorizontal: 10 },
  colHeader: { fontWeight: '700', fontSize: 15, marginBottom: 10, textAlign: 'center' },
  card:      { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 8,
               shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  type:      { fontWeight: '600', fontSize: 14 },
  meta:      { color: '#666', fontSize: 12 },
  notes:     { color: '#888', fontSize: 12 },
  empty:     { color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 20 },
});
```

---

## 7.4 Add Screens to Navigator

Update `mobile/src/navigation/AppNavigator.js` — add imports and screens:

```jsx
import FriendsScreen from '../screens/FriendsScreen';
import CompareScreen from '../screens/CompareScreen';

// In MainTabs (bottom tabs):
<Tab.Screen name="Friends" component={FriendsScreen} />

// In the root Stack.Navigator (so Compare slides in full screen):
<Stack.Screen name="Compare" component={CompareScreen} />
```

---

## Checklist

- [ ] Can send a friend request by username
- [ ] Pending requests appear on the Friends screen
- [ ] Accepting a request adds the user to your friends list
- [ ] Tapping a friend navigates to the Compare screen
- [ ] Compare screen shows both users' activities for today side by side
- [ ] Viewing a non-friend's activities returns a 403 error

---

## Next Step → [STEP_8_LANDING_PAGE.md](STEP_8_LANDING_PAGE.md)
