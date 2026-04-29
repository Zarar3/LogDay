# Step 6 — Activity Logging

## Goal
Build the API and mobile screens to create, view, and delete custom activity log entries for a specific day.

---

## 6.1 Activity Routes (Backend)

Open `backend/src/routes/activities.js` and replace it with:

```js
const router = require('express').Router();
const prisma = require('../prisma');
const auth   = require('../middleware/auth');

// GET /api/activities?date=YYYY-MM-DD  — get your logs for a day
router.get('/', auth, async (req, res) => {
  const { date } = req.query;
  const where = { userId: req.user.id };
  if (date) where.date = date;

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
  });
  res.json(activities);
});

// POST /api/activities  — log a new activity
router.post('/', auth, async (req, res) => {
  const { type, duration, notes, date } = req.body;
  if (!type || !date)
    return res.status(400).json({ error: 'type and date are required' });

  const activity = await prisma.activity.create({
    data: { userId: req.user.id, type, duration, notes, date },
  });
  res.status(201).json(activity);
});

// DELETE /api/activities/:id
router.delete('/:id', auth, async (req, res) => {
  const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!activity || activity.userId !== req.user.id)
    return res.status(404).json({ error: 'Activity not found' });

  await prisma.activity.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// GET /api/activities/user/:userId?date=YYYY-MM-DD  — get a friend's logs (friends only)
router.get('/user/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  const { date }   = req.query;

  // Check they are friends
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: req.user.id, userBId: userId },
        { userAId: userId,      userBId: req.user.id },
      ],
    },
  });
  if (!friendship)
    return res.status(403).json({ error: 'You are not friends with this user' });

  const where = { userId };
  if (date) where.date = date;

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
  });
  res.json(activities);
});

module.exports = router;
```

---

## 6.2 Home Screen — Today's Log

Replace `mobile/src/screens/HomeScreen.js` with:

```jsx
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';

function todayDate() {
  return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
}

export default function HomeScreen({ navigation }) {
  const [activities, setActivities] = useState([]);

  useFocusEffect(
    useCallback(() => {
      api.get(`/activities?date=${todayDate()}`)
        .then(r => setActivities(r.data))
        .catch(() => {});
    }, [])
  );

  async function deleteActivity(id) {
    await api.delete(`/activities/${id}`);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  function confirmDelete(id) {
    Alert.alert('Delete', 'Remove this activity?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteActivity(id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Today's Log</Text>
      <Text style={styles.date}>{todayDate()}</Text>

      <FlatList
        data={activities}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No activities yet. Add one!</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.type}>{item.type}</Text>
              {item.duration ? <Text style={styles.meta}>{item.duration} min</Text> : null}
              {item.notes    ? <Text style={styles.notes}>{item.notes}</Text>         : null}
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item.id)}>
              <Text style={styles.delete}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('LogActivity')}>
        <Text style={styles.fabText}>+ Log Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  heading:   { fontSize: 28, fontWeight: 'bold', marginTop: 40 },
  date:      { color: '#888', marginBottom: 16 },
  card:      { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
               flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
               shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardLeft:  { flex: 1 },
  type:      { fontSize: 16, fontWeight: '600' },
  meta:      { color: '#666', fontSize: 13 },
  notes:     { color: '#888', fontSize: 13, marginTop: 2 },
  delete:    { color: '#f00', fontSize: 18, paddingLeft: 10 },
  empty:     { textAlign: 'center', color: '#aaa', marginTop: 60 },
  fab:       { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12,
               alignItems: 'center', marginTop: 12 },
  fabText:   { color: '#fff', fontWeight: '600', fontSize: 16 },
});
```

---

## 6.3 Log Activity Screen

Create `mobile/src/screens/LogActivityScreen.js`:

```jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import api from '../api';

const SUGGESTIONS = ['Running', 'Walking', 'Gym', 'Reading', 'Cooking', 'Gaming', 'Studying', 'Meditation'];

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function LogActivityScreen({ navigation }) {
  const [type, setType]         = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes]       = useState('');

  async function handleSubmit() {
    if (!type.trim()) return Alert.alert('Error', 'Activity type is required');
    try {
      await api.post('/activities', {
        type: type.trim(),
        duration: duration ? parseInt(duration) : null,
        notes: notes.trim() || null,
        date: todayDate(),
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save activity');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Log an Activity</Text>

      <Text style={styles.label}>Activity Type</Text>
      <TextInput style={styles.input} placeholder="e.g. Running" value={type} onChangeText={setType} />

      <View style={styles.chips}>
        {SUGGESTIONS.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, type === s && styles.chipActive]}
            onPress={() => setType(s)}>
            <Text style={[styles.chipText, type === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Duration (minutes, optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. 30" value={duration}
        onChangeText={setDuration} keyboardType="number-pad" />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={[styles.input, styles.textarea]} placeholder="How did it go?"
        value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content:   { padding: 24 },
  heading:   { fontSize: 26, fontWeight: 'bold', marginBottom: 24, marginTop: 20 },
  label:     { fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input:     { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  textarea:  { height: 80, textAlignVertical: 'top' },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
               borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  chipActive:    { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText:      { color: '#555' },
  chipTextActive:{ color: '#fff' },
  button:    { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8,
               alignItems: 'center', marginTop: 28 },
  buttonText:{ color: '#fff', fontWeight: '600', fontSize: 16 },
});
```

---

## 6.4 Add LogActivity to Navigator

Open `mobile/src/navigation/AppNavigator.js` and add `LogActivityScreen` to the stack inside `MainTabs` or the root stack:

```jsx
import LogActivityScreen from '../screens/LogActivityScreen';

// Inside the MainTabs stack navigator, add:
<Stack.Screen name="LogActivity" component={LogActivityScreen} />
```

Add it as a screen in the main Stack.Navigator (not the Tab.Navigator) so it slides in on top.

---

## Checklist

- [ ] `POST /api/activities` creates a new activity
- [ ] `GET /api/activities?date=YYYY-MM-DD` returns that day's activities
- [ ] `DELETE /api/activities/:id` removes an activity
- [ ] Home screen shows today's activities
- [ ] Tapping "Log Activity" opens the log screen
- [ ] Selecting a suggestion chip fills in the type
- [ ] Saving navigates back to Home and the new entry appears

---

## Next Step → [STEP_7_FRIENDS.md](STEP_7_FRIENDS.md)
