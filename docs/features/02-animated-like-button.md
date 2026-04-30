# Animated Like Button

## What it does
When a user taps the like button on a post or comment, the heart/icon scales up, bounces, and snaps to a filled color. The animation plays instantly on tap (optimistic UI) so it never feels laggy.

## Backend changes
None — the animation is purely visual on top of the existing like toggle API.

## Frontend changes
- `DiscoverScreen.js` — post like button
- `CommentsScreen.js` — comment like button
- New shared component: `mobile/src/components/LikeButton.js`

## Dependencies
None — uses React Native's built-in `Animated` API.

## Step-by-step implementation

### 1. Create `mobile/src/components/LikeButton.js`

```js
import React, { useRef, useCallback } from 'react';
import { TouchableWithoutFeedback, Animated, Text, StyleSheet } from 'react-native';

export default function LikeButton({ liked, count, onPress, size = 15, color = '#ef4444' }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    // Burst: scale up then bounce back
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
  row:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { fontWeight: '700' },
});
```

### 2. Use it in DiscoverScreen.js

Replace the existing like button in the post card with:

```js
import LikeButton from '../components/LikeButton';

// Inside your card render:
<LikeButton
  liked={post.isLiked}
  count={post.likeCount}
  onPress={() => toggleLike(post.id, post.isLiked)}
/>
```

Keep the existing `toggleLike` function that calls the API and updates state — the component only handles animation.

### 3. Use it in CommentsScreen.js

```js
<LikeButton
  liked={comment.isLiked}
  count={comment.likeCount}
  onPress={() => toggleCommentLike(comment.id, comment.parentId)}
  size={13}
/>
```

### 4. Optimistic state update pattern

Make sure your toggle function updates local state *before* the API call resolves so the animation and color change feel instant:

```js
async function toggleLike(postId, currentlyLiked) {
  // Optimistic update
  setPosts(prev => prev.map(p =>
    p.id === postId
      ? { ...p, isLiked: !currentlyLiked, likeCount: p.likeCount + (currentlyLiked ? -1 : 1) }
      : p
  ));
  try {
    await api.post(`/activities/${postId}/like`);
  } catch {
    // Revert on failure
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: currentlyLiked, likeCount: p.likeCount + (currentlyLiked ? 1 : -1) }
        : p
    ));
  }
}
```

## How to test
1. Open the Feed screen.
2. Tap like → icon should scale up, bounce, then settle as filled ❤️.
3. Tap again → same animation, reverts to 🤍.
4. Kill the network and tap like — icon animates + count changes, then silently reverts when API fails.
5. Check comments screen — same animation at smaller size.
