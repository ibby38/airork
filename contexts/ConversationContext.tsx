import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = "@conversations";

export const [ConversationProvider, useConversations] = createContextHook(() => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversations = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setConversations(conversationsWithDates);
        if (conversationsWithDates.length > 0 && !currentConversationId) {
          setCurrentConversationId(conversationsWithDates[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversations = async (convs: Conversation[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    } catch (error) {
      console.error("Error saving conversations:", error);
    }
  };

  const createNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setCurrentConversationId(newConv.id);
    saveConversations(updated);
    return newConv.id;
  }, [conversations]);

  const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.id === conversationId) {
          const newMessages = [...conv.messages, message];
          const title =
            conv.messages.length === 0
              ? message.content.slice(0, 40) + (message.content.length > 40 ? "..." : "")
              : conv.title;
          return {
            ...conv,
            messages: newMessages,
            title,
            updatedAt: new Date(),
          };
        }
        return conv;
      });
      saveConversations(updated);
      return updated;
    });
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    const updated = conversations.filter((conv) => conv.id !== conversationId);
    setConversations(updated);
    if (currentConversationId === conversationId) {
      setCurrentConversationId(updated.length > 0 ? updated[0].id : null);
    }
    saveConversations(updated);
  }, [conversations, currentConversationId]);

  const getCurrentConversation = useCallback(() => {
    return conversations.find((conv) => conv.id === currentConversationId);
  }, [conversations, currentConversationId]);

  return useMemo(
    () => ({
      conversations,
      currentConversationId,
      isLoading,
      setCurrentConversationId,
      createNewConversation,
      addMessageToConversation,
      deleteConversation,
      getCurrentConversation,
    }),
    [
      conversations,
      currentConversationId,
      isLoading,
      createNewConversation,
      addMessageToConversation,
      deleteConversation,
      getCurrentConversation,
    ]
  );
});
