import { GoogleGenAI } from "@google/genai";
import { Stack } from "expo-router";
import {
  History,

  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Message,
  useConversations,
} from "../contexts/ConversationContext";

const GEMINI_API_KEY = "AIzaSyCV04RCn_R2quzFkiVcg3Qh4kD7MHwb5l0";

export default function ChatScreen() {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createNewConversation,
    addMessageToConversation,
    deleteConversation,
    getCurrentConversation,
  } = useConversations();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const currentConversation = getCurrentConversation();
  const messages = currentConversation?.messages || [];

  useEffect(() => {
    if (!currentConversationId && conversations.length === 0) {
      createNewConversation();
    }
  }, [currentConversationId, conversations.length, createNewConversation]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = createNewConversation();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessageToConversation(conversationId, userMessage);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: input.trim(),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          response.text || "I apologize, but I couldn't generate a response.",
        timestamp: new Date(),
      };

      addMessageToConversation(conversationId, assistantMessage);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      addMessageToConversation(conversationId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    currentConversationId,
    createNewConversation,
    addMessageToConversation,
  ]);

  const handleNewChat = useCallback(() => {
    createNewConversation();
    setShowHistory(false);
  }, [createNewConversation]);

  const handleDeleteConversation = useCallback(
    (convId: string) => {
      deleteConversation(convId);
    },
    [deleteConversation]
  );

  const handleSelectConversation = useCallback(
    (convId: string) => {
      setCurrentConversationId(convId);
      setShowHistory(false);
    },
    [setCurrentConversationId]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View
        style={[
          styles.topGradient,
          { paddingTop: insets.top, minHeight: insets.top + 60 },
        ]}
      />

      <View
        style={[
          styles.floatingTopNav,
          { top: insets.top + 8, left: 16, right: 16 },
        ]}
      >
        <View style={styles.topNavContent}>
          <View style={styles.logoContainer}>
            <Sparkles size={24} color="#2563EB" strokeWidth={2} />
            <Text style={styles.logoText}>ACNI</Text>
          </View>
          <View style={styles.topNavActions}>
            <Pressable
              onPress={handleNewChat}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <Plus size={22} color="#334155" strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={() => setShowHistory(true)}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <History size={22} color="#334155" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: insets.bottom + 100, paddingTop: insets.top + 84 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.iconContainer}>
                <Sparkles size={56} color="#2563EB" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Ready to Chat?</Text>
              <Text style={styles.emptySubtitle}>
                I&apos;m powered by Gemini 2.5 Flash. Ask me anything!
              </Text>
            </View>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={message.id} message={message} index={index} />
          ))}

          {isLoading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.floatingInputContainer,
            { bottom: insets.bottom + 16, left: 16, right: 16 },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type your message..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
              editable={!isLoading}
              returnKeyType="default"
            />
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || isLoading}
              style={({ pressed }) => [
                styles.sendButton,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
                pressed && styles.sendButtonPressed,
              ]}
            >
              <Send
                size={20}
                color="#fff"
                fill={!input.trim() || isLoading ? "transparent" : "#fff"}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowHistory(false)}
          />
          <View
            style={[
              styles.historyPanel,
              { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={styles.historyHeader}>
              <View style={styles.historyHeaderLeft}>
                <MessageSquare size={24} color="#2563EB" strokeWidth={2} />
                <Text style={styles.historyTitle}>Conversations</Text>
              </View>
              <Pressable
                onPress={() => setShowHistory(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <X size={24} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.historyList}
              showsVerticalScrollIndicator={false}
            >
              {conversations.map((conv) => (
                <View key={conv.id} style={styles.historyItemContainer}>
                  <Pressable
                    onPress={() => handleSelectConversation(conv.id)}
                    style={({ pressed }) => [
                      styles.historyItem,
                      conv.id === currentConversationId &&
                        styles.historyItemActive,
                      pressed && styles.historyItemPressed,
                    ]}
                  >
                    <View style={styles.historyItemContent}>
                      <Text
                        style={[
                          styles.historyItemTitle,
                          conv.id === currentConversationId &&
                            styles.historyItemTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {conv.title}
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {conv.messages.length} messages
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteConversation(conv.id)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                    ]}
                  >
                    <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                  </Pressable>
                </View>
              ))}

              {conversations.length === 0 && (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>
                    No conversations yet
                  </Text>
                  <Text style={styles.emptyHistorySubtext}>
                    Start a new chat to begin
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MessageBubble({
  message,
  index,
}: {
  message: Message;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const isUser = message.role === "user";

  return (
    <Animated.View
      style={[
        styles.messageWrapper,
        isUser ? styles.userMessageWrapper : styles.assistantMessageWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  topGradient: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1E3A8A",
    zIndex: 0,
  },
  floatingTopNav: {
    position: "absolute" as const,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  topNavContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#1E293B",
  },
  topNavActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  iconContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  userMessageWrapper: {
    alignSelf: "flex-end",
  },
  assistantMessageWrapper: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: "#1E293B",
  },
  floatingInputContainer: {
    position: "absolute" as const,
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    maxHeight: 120,
    paddingVertical: 8,
    paddingRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBackdrop: {
    flex: 1,
  },
  historyPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  historyHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#1E293B",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  historyItem: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  historyItemActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  historyItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  historyItemContent: {
    gap: 4,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#334155",
  },
  historyItemTitleActive: {
    color: "#1E40AF",
  },
  historyItemDate: {
    fontSize: 13,
    color: "#94A3B8",
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  emptyHistory: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#64748B",
    marginBottom: 4,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: "#94A3B8",
  },
});
