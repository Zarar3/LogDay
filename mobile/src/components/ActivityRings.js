import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

function Ring({ size, strokeWidth, progress, color, bgColor }) {
  const r      = (size - strokeWidth) / 2;
  const cx     = size / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={cx} cy={cx} r={r} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={cx} cy={cx} r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RingItem({ size, strokeWidth, progress, color, bgColor, label, value, textSecondary, textPrimary }) {
  return (
    <View style={styles.item}>
      <View style={{ width: size, height: size }}>
        <Ring size={size} strokeWidth={strokeWidth} progress={progress} color={color} bgColor={bgColor} />
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: size * 0.22, fontWeight: '900', color: textPrimary, lineHeight: size * 0.26 }}>
            {value}
          </Text>
        </View>
      </View>
      <Text style={[styles.label, { color: textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function ActivityRings({
  streak, sessionsToday, goalsDone, goalsTotal,
  accent, border, textSecondary, textPrimary,
}) {
  const streakTarget = Math.max(7, Math.ceil(streak / 7) * 7);
  const streakPct    = streak / streakTarget;
  const sessionPct   = Math.min(1, sessionsToday);
  const goalPct      = goalsTotal > 0 ? goalsDone / goalsTotal : 0;
  const bg           = border;

  return (
    <View style={styles.row}>
      <RingItem
        size={72} strokeWidth={9}
        progress={streakPct} color={accent} bgColor={bg}
        label="streak 🔥"
        value={streak}
        textSecondary={textSecondary}
        textPrimary={textPrimary}
      />
      <RingItem
        size={72} strokeWidth={9}
        progress={sessionPct} color={accent} bgColor={bg}
        label="logged 📋"
        value={sessionsToday}
        textSecondary={textSecondary}
        textPrimary={textPrimary}
      />
      <RingItem
        size={72} strokeWidth={9}
        progress={goalPct} color={accent} bgColor={bg}
        label="goals 🎯"
        value={goalsTotal === 0 ? '—' : `${goalsDone}/${goalsTotal}`}
        textSecondary={textSecondary}
        textPrimary={textPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 8 },
  item:  { alignItems: 'center', gap: 8 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
