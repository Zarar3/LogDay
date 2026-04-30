import React, { useRef, useCallback } from 'react';
import { TouchableWithoutFeedback, Animated, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function LikeButton({ liked, count, onPress, size = 15, color = '#ef4444' }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.45, useNativeDriver: true, speed: 50, bounciness: 10 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 4  }),
    ]).start();
    onPress();
  }, [onPress, scale]);

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <Text style={{ fontSize: size, color: liked ? color : '#94a3b8' }}>
          {liked ? '❤️' : '🤍'}
        </Text>
        {count > 0 && (
          <Text style={[styles.count, { fontSize: size - 2, color: liked ? color : '#94a3b8' }]}>
            {count}
          </Text>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  count: { fontWeight: '700' },
});