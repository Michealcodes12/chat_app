"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Conversation, getConversations } from '@/lib/api';

export function ConversationsList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      try {
        const data = await getConversations();
        setConversations(data);
      } catch (e) {
        console.error("Failed to load conversations", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadConversations();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-surface-hover animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-foreground/50 text-sm">
        No conversations yet. Search for a user to start chatting!
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full">
      {conversations.map(conv => (
        <Link 
          key={conv.user_id} 
          href={`/c/${conv.user_id}`}
          className="flex flex-col p-4 border-b border-border hover:bg-surface-hover transition-colors"
        >
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-semibold text-foreground truncate">{conv.display_name}</span>
            <span className="text-xs text-foreground/50 whitespace-nowrap ml-2">
              {new Date(conv.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <span className="text-sm text-foreground/60 truncate">@{conv.username}</span>
        </Link>
      ))}
    </div>
  );
}
