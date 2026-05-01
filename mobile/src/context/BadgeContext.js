import React, { createContext, useContext, useState } from 'react';
import api from '../api';

const BadgeContext = createContext({ pendingFriends: 0, unreadMessages: 0, refresh: () => {} });

export function BadgeProvider({ children }) {
  const [pendingFriends, setPending] = useState(0);
  const [unreadMessages, setUnread]  = useState(0);

  async function refresh() {
    try {
      const [fr, msg] = await Promise.all([
        api.get('/friends/pending-count'),
        api.get('/messages/unread-count'),
      ]);
      setPending(fr.data.count);
      setUnread(msg.data.count);
    } catch {}
  }

  return (
    <BadgeContext.Provider value={{ pendingFriends, unreadMessages, refresh }}>
      {children}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => useContext(BadgeContext);
