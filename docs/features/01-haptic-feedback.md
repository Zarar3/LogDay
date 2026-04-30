# Haptic Feedback

## What it does
Adds physical vibration responses to key user interactions — liking a post, completing a goal, sending a message, and accepting a friend request. Makes the app feel tactile and premium at zero visual cost.

## Backend changes
None — haptics are entirely client-side.

## Frontend changes
- `DiscoverScreen.js` — like toggle
- `HomeScreen.js` — goal complete/uncomplete
- `CommentsScreen.js` — send comment, like comment
- `MessagesScreen.js` / `ConversationScreen.js` — send message
- `FriendsScreen.js` — accept friend request

## Dependencies
Expo includes `expo-haptics` out of the box. No install needed if you're on Expo SDK 45+.

```bash
# only needed if not already in package.json
npx expo install expo-haptics
```

## Step-by-step implementation

### 1. Import in each screen
```js
import * as Haptics from 'expo-haptics';
```

### 2. Like a post (DiscoverScreen.js)
```js
async function toggleLike(postId, liked) {
  // fire haptic immediately before the API call
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // ... existing API call
}
```

### 3. Complete a goal (HomeScreen.js)
```js
async function toggleGoal(goal) {
  const completing = !goal.done;
  if (completing) {
    // Stronger feedback for a completion milestone
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  // ... existing API call
}
```

### 4. Send a message (ConversationScreen.js)
```js
async function sendMessage() {
  if (!text.trim()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // ... existing send logic
}
```

### 5. Accept a friend request (FriendsScreen.js)
```js
async function acceptRequest(id) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // ... existing API call
}
```

### 6. Like a comment (CommentsScreen.js)
```js
async function toggleCommentLike(commentId, parentId) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // ... existing toggle logic
}
```

## Haptic style reference

| Style | Use case |
|-------|----------|
| `ImpactFeedbackStyle.Light` | Likes, minor taps |
| `ImpactFeedbackStyle.Medium` | Sending messages, submitting forms |
| `ImpactFeedbackStyle.Heavy` | Destructive actions (delete) |
| `NotificationFeedbackType.Success` | Goal complete, friend accepted |
| `NotificationFeedbackType.Error` | API failure, validation error |
| `NotificationFeedbackType.Warning` | Soft warnings |

## How to test
1. Run on a physical device (haptics don't fire in simulator).
2. Like a post → feel a light tap.
3. Check the "mark done" goal button → feel a stronger success pulse.
4. Send a message → feel a medium impact.
5. iOS and Android both support all styles listed above via Expo.
