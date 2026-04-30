# Streak Calendar (Activity Heatmap)

## What it does
Shows a 12-week grid on the profile screen where each cell represents one day. Days with logged activities are filled in the accent color; empty days are hollow. Works like the GitHub contribution calendar. Gives users a visual history to protect and motivates long streaks.

## Backend changes

### New route: `GET /api/activities/calendar?weeks=12`

Add to `backend/src/routes/activities.js` (before `/:id`):

```js
// GET /api/activities/calendar?weeks=12
router.get('/calendar', auth, async (req, res) => {
  const weeks = Math.min(parseInt(req.query.weeks) || 12, 52);
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceStr = since.toISOString().split('T')[0];

  const activities = await prisma.activity.findMany({
    where: { userId: req.user.id, date: { gte: sinceStr } },
    select: { date: true },
  });

  // Deduplicate — just need which dates had activity
  const activeDates = [...new Set(activities.map(a => a.date))];
  res.json({ activeDates, since: sinceStr });
});
```

## Frontend changes
- `ProfileScreen.js` — add `CalendarGrid` component below the stats section

## Dependencies
None — pure React Native layout with `View` grids.

## Step-by-step implementation

### 1. Build date utilities

```js
// Returns array of YYYY-MM-DD strings for the last `weeks` weeks,
// padded so week 0 starts on Sunday.
function buildGrid(weeks) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const cells = [];

  for (let i = (weeks * 7 + dayOfWeek); i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    cells.push(d.toISOString().split('T')[0]);
  }
  return cells;
}
```

### 2. CalendarGrid component (add inside ProfileScreen.js)

```js
function CalendarGrid({ activeDates = [], weeks = 12 }) {
  const { accent, border, cardBg } = useTheme();
  const activeSet = new Set(activeDates);
  const cells     = buildGrid(weeks);
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const CELL = 14;
  const GAP  = 3;

  // Group into columns of 7
  const columns = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      {/* Day labels */}
      <View style={{ flexDirection: 'row', marginBottom: 4, marginLeft: 2 }}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={{ width: CELL + GAP, fontSize: 8, color: '#94a3b8',
                                  fontWeight: '700', textAlign: 'center' }}>{d}</Text>
        ))}
      </View>

      {/* Grid — rendered as rows of days (transpose of columns) */}
      <View style={{ flexDirection: 'row', gap: GAP }}>
        {columns.map((col, ci) => (
          <View key={ci} style={{ flexDirection: 'column', gap: GAP }}>
            {col.map(date => {
              const active = activeSet.has(date);
              return (
                <View key={date} style={{
                  width: CELL, height: CELL, borderRadius: 3,
                  backgroundColor: active ? accent : 'transparent',
                  borderWidth: active ? 0 : 1,
                  borderColor: border,
                }} />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
```

### 3. Fetch calendar data in ProfileScreen.js

Add state and fetch:

```js
const [calendarDates, setCalendarDates] = useState([]);

// Inside loadAll():
const calRes = await api.get('/activities/calendar?weeks=12');
setCalendarDates(calRes.data.activeDates);
```

### 4. Place CalendarGrid in the render

Add inside the profile `ScrollView`, below the stats footer card and above the color pickers:

```js
<View style={[styles.colorSection, { backgroundColor: cardBg, borderColor: border }]}>
  <Text style={[styles.sectionHeader, { color: textPrimary, marginBottom: 16 }]}>
    Activity History
  </Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <CalendarGrid activeDates={calendarDates} weeks={12} />
  </ScrollView>
</View>
```

Wrapping in a horizontal `ScrollView` handles narrow screens gracefully.

### 5. Month label row (optional polish)

Insert month abbreviations above the column grid by checking when the month changes between columns:

```js
{columns.map((col, ci) => {
  const firstDate = col[0];
  const month = new Date(firstDate + 'T00:00:00').toLocaleString('default', { month: 'short' });
  const showLabel = ci === 0 || new Date(firstDate + 'T00:00:00').getDate() <= 7;
  return (
    <Text key={ci} style={{ width: CELL + GAP, fontSize: 7, color: '#94a3b8', textAlign: 'left' }}>
      {showLabel ? month : ''}
    </Text>
  );
})}
```

## How to test
1. Open Profile — calendar appears with empty cells for days with no logs.
2. Log an activity for today → reload Profile → today's cell fills in.
3. Log backdated activities (use different `date` strings) → verify those cells fill.
4. Check the grid starts on a Sunday column regardless of today's day.
5. Change accent color → calendar cells update to match.
