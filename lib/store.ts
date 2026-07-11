"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { ChatResponse } from "@/lib/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  timestamp: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

type ConversationStore = {
  conversations: Conversation[];
  activeConversationId: string | null;

  getActiveConversation: () => Conversation | undefined;
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateLastAssistantMessage: (conversationId: string, content: string, response: ChatResponse) => void;
  renameConversation: (id: string, title: string) => void;
  getSortedConversations: () => Conversation[];
};

function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/[?!.]+$/, "");
  if (cleaned.length <= 48) return cleaned;
  return cleaned.slice(0, 48).trim() + "...";
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId);
      },

      createConversation: () => {
        const id = uuidv4();
        const now = Date.now();
        const conversation: Conversation = {
          id,
          title: "New chat",
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          const newActiveId =
            state.activeConversationId === id
              ? filtered[0]?.id ?? null
              : state.activeConversationId;
          return {
            conversations: filtered,
            activeConversationId: newActiveId,
          };
        });
      },

      setActiveConversation: (id: string) => {
        set({ activeConversationId: id });
      },

      addMessage: (conversationId: string, message: ChatMessage) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const updatedMessages = [...c.messages, message];
            const title =
              c.messages.length === 0 && message.role === "user"
                ? generateTitle(message.content)
                : c.title;
            return {
              ...c,
              messages: updatedMessages,
              title,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateLastAssistantMessage: (
        conversationId: string,
        content: string,
        response: ChatResponse
      ) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages];
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === "assistant") {
                messages[i] = { ...messages[i], content, response };
                break;
              }
            }
            return { ...c, messages, updatedAt: Date.now() };
          }),
        }));
      },

      renameConversation: (id: string, title: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }));
      },

      getSortedConversations: () => {
        return [...get().conversations].sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
      },
    }),
    {
      name: "aims-conversations",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
