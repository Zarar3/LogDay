const ICONS = {
  Running:    '🏃',
  Walking:    '🚶',
  Gym:        '🏋️',
  Reading:    '📚',
  Cooking:    '🍳',
  Gaming:     '🎮',
  Studying:   '📖',
  Meditation: '🧘',
  Music:      '🎵',
  Art:        '🎨',
  Cycling:    '🚴',
  Swimming:   '🏊',
  Yoga:       '🤸',
  Hiking:     '🥾',
  Football:   '⚽',
  Basketball: '🏀',
  Tennis:     '🎾',
};

export function getActivityIcon(type) {
  if (!type) return '📋';
  if (ICONS[type]) return ICONS[type];
  const key = Object.keys(ICONS).find(k => k.toLowerCase() === type.toLowerCase());
  return key ? ICONS[key] : '⭐';
}
