# Quick-Log Presets

## What it does
Lets users save their most common workout combos (e.g., "Morning Run – 30 min") and log them in a single tap from the Home screen. Removes the friction of filling in the log form repeatedly for routine workouts.

## Backend changes

### 1. Add Preset model (`backend/prisma/schema.prisma`)

```prisma
model Preset {
  id        String   @id @default(uuid())
  userId    String
  name      String
  type      String
  duration  Int?
  notes     String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add back-relation on User:
```prisma
model User {
  // ...
  presets Preset[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add_presets
```

### 2. Presets routes (`backend/src/routes/presets.js`)

```js
const router = require('express').Router();
const prisma  = require('../prisma');
const auth    = require('../middleware/auth');

// GET /api/presets
router.get('/', auth, async (req, res) => {
  const presets = await prisma.preset.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(presets);
});

// POST /api/presets
router.post('/', auth, async (req, res) => {
  const { name, type, duration, notes } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const preset = await prisma.preset.create({
    data: { userId: req.user.id, name, type, duration: duration || null, notes: notes || null },
  });
  res.status(201).json(preset);
});

// DELETE /api/presets/:id
router.delete('/:id', auth, async (req, res) => {
  const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
  if (!preset || preset.userId !== req.user.id)
    return res.status(404).json({ error: 'Not found' });
  await prisma.preset.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
```

### 3. Register in `backend/src/app.js`

```js
app.use('/api/presets', require('./routes/presets'));
```

### 4. One-tap log endpoint

Reuse `POST /api/activities` — the mobile client sends the preset's fields as the body. No new endpoint needed.

## Frontend changes
- `HomeScreen.js` — preset strip and quick-log UI
- `LogActivityScreen.js` — "Save as preset" button after logging

## Step-by-step implementation

### 1. Fetch presets in HomeScreen.js

```js
const [presets, setPresets] = useState([]);

async function loadPresets() {
  try {
    const { data } = await api.get('/presets');
    setPresets(data);
  } catch {}
}

// Call in useFocusEffect alongside other fetches
```

### 2. Preset strip component

```js
function PresetStrip({ presets, onLog, onDelete }) {
  const { accent, cardBg, textPrimary, textSecondary, border } = useTheme();
  if (presets.length === 0) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[pStyles.label, { color: textSecondary }]}>Quick Log</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {presets.map(p => (
          <TouchableOpacity key={p.id} style={[pStyles.card, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => onLog(p)}
            onLongPress={() => onDelete(p.id)}>
            <Text style={[pStyles.name, { color: textPrimary }]}>{p.name}</Text>
            <Text style={[pStyles.sub, { color: accent }]}>
              {p.type}{p.duration ? `  •  ${p.duration}m` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={[pStyles.hint, { color: textSecondary }]}>Long-press to delete</Text>
    </View>
  );
}

const pStyles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
           letterSpacing: 0.8, marginBottom: 10 },
  card:  { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14,
           paddingVertical: 10, marginRight: 10, minWidth: 110 },
  name:  { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  sub:   { fontSize: 12, fontWeight: '600' },
  hint:  { fontSize: 10, marginTop: 6 },
});
```

### 3. Wire up onLog and onDelete in HomeScreen

```js
async function logPreset(preset) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  try {
    const today = new Date().toISOString().split('T')[0];
    await api.post('/activities', {
      type: preset.type,
      duration: preset.duration,
      notes: preset.notes,
      date: today,
    });
    loadActivities(); // refresh the activity list
  } catch {
    Alert.alert('Error', 'Could not log activity.');
  }
}

async function deletePreset(id) {
  try {
    await api.delete(`/presets/${id}`);
    setPresets(prev => prev.filter(p => p.id !== id));
  } catch {}
}
```

### 4. "Save as Preset" in LogActivityScreen.js

After a successful log, prompt the user:

```js
const { data: activity } = await api.post('/activities', payload);

Alert.alert(
  'Logged!',
  'Save this as a quick-log preset?',
  [
    { text: 'No', style: 'cancel', onPress: () => navigation.goBack() },
    {
      text: 'Save Preset',
      onPress: async () => {
        const name = `${type}${duration ? ` ${duration}m` : ''}`;
        await api.post('/presets', { name, type, duration, notes });
        navigation.goBack();
      },
    },
  ]
);
```

## How to test
1. Log an activity → tap "Save Preset" → preset appears on Home.
2. Tap the preset card → activity logged instantly, list refreshes.
3. Long-press preset → it disappears.
4. Create multiple presets → horizontal scroll works.
5. Kill and reopen app → presets persist (stored in DB).
