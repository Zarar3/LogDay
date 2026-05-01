import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

export default function SwipeableCard({ onDelete, onEdit, children }) {
  const swipeRef = useRef(null);

  function renderLeftActions(progress, dragX) {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.editAction}
        onPress={() => {
          swipeRef.current?.close();
          onEdit?.();
        }}>
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          ✏️{'\n'}Edit
        </Animated.Text>
      </TouchableOpacity>
    );
  }

  function renderRightActions(progress, dragX) {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}>
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          🗑️{'\n'}Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={onEdit ? renderLeftActions : undefined}
      renderRightActions={renderRightActions}
      leftThreshold={40}
      rightThreshold={40}
      friction={2}
      overshootRight={false}
      overshootLeft={false}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  editAction: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 12,
    marginLeft: 12,
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 20,
    marginLeft: 8,
    marginBottom: 12,
    marginRight: 12,
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 12, textAlign: 'center' },
});
