"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  Message,
  getMessages,
  getPublicKey,
  sendMessageOffline,
} from "@/lib/api";
import { importPublicKey, encryptMessage, decryptMessage } from "@/lib/crypto";

interface DecryptedMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  plaintext: string;
  created_at: string;
}

export function ChatWindow({ recipientId }: { recipientId: string }) {
  const { user, privateKey } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [recipientName, setRecipientName] = useState("Loading...");
  const [isFetching, setIsFetching] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recipientKeyRef = useRef<CryptoKey | null>(null);
  const selfPublicKeyRef = useRef<CryptoKey | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup keys, history, and WS
  useEffect(() => {
    if (!user || !privateKey) return;

    let isMounted = true;

    async function setupChat() {
      try {
        setIsFetching(true);

        // 1. Fetch & import recipient public key
        const { public_key: recipientPubKeyBase64 } =
          await getPublicKey(recipientId);
        recipientKeyRef.current = await importPublicKey(recipientPubKeyBase64);

        // Use a heuristic for recipient name for now, or fetch from /users/search
        setRecipientName("Chat");

        // 2. Import self public key
        selfPublicKeyRef.current = await importPublicKey(user!.public_key);

        // 3. Connect to WebSocket
        const token = localStorage.getItem("access_token");
        const ws = new WebSocket(
          `wss://whisperbox.koyeb.app/ws?token=${token}`,
        );

        ws.onopen = () => {
          if (isMounted) setIsConnected(true);
        };

        ws.onclose = () => {
          if (isMounted) setIsConnected(false);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === "message.receive") {
              const msgPayload = data.payload;
              const plaintext = await decryptMessage(
                msgPayload.ciphertext,
                msgPayload.iv,
                msgPayload.encryptedKey,
                privateKey!,
              );

              if (isMounted) {
                setMessages((prev) => {
                  // Prevent duplicates if already added optimistically (though we don't receive our own)
                  if (prev.find((m) => m.id === data.id)) return prev;
                  return [
                    ...prev,
                    {
                      id: data.id,
                      from_user_id: data.from_user_id,
                      to_user_id: data.to_user_id,
                      plaintext,
                      created_at: data.created_at,
                    },
                  ].sort(
                    (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime(),
                  );
                });
              }
            } else if (data.event === "error") {
              console.error("WS Error:", data);
              showToast(data.detail || "WebSocket error", "error");
            }
          } catch (e) {
            console.error("Failed to process WS message", e);
          }
        };

        wsRef.current = ws;

        // 4. Fetch history
        const history = await getMessages(recipientId, 50); // gets newest first

        const decryptedHistory: DecryptedMessage[] = [];
        for (const msg of history) {
          try {
            const keyToDecrypt =
              msg.from_user_id === user!.id
                ? msg.payload.encryptedKeyForSelf
                : msg.payload.encryptedKey;

            const plaintext = await decryptMessage(
              msg.payload.ciphertext,
              msg.payload.iv,
              keyToDecrypt,
              privateKey!,
            );

            decryptedHistory.push({
              id: msg.id,
              from_user_id: msg.from_user_id,
              to_user_id: msg.to_user_id,
              plaintext,
              created_at: msg.created_at,
            });
          } catch (e) {
            console.error("Failed to decrypt a historical message", e);
            decryptedHistory.push({
              id: msg.id,
              from_user_id: msg.from_user_id,
              to_user_id: msg.to_user_id,
              plaintext: "[Decryption Failed]",
              created_at: msg.created_at,
            });
          }
        }

        // Sort oldest to newest
        decryptedHistory.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        if (isMounted) {
          setMessages(decryptedHistory);
          setIsFetching(false);
        }
      } catch (error) {
        if (isMounted) {
          showToast(
            (error as Error).message || "Failed to setup chat",
            "error",
          );
          setIsFetching(false);
        }
      }
    }

    setupChat();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [recipientId, user, privateKey, showToast]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !inputText.trim() ||
      isSending ||
      !recipientKeyRef.current ||
      !selfPublicKeyRef.current
    )
      return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      // 1. Encrypt
      const payload = await encryptMessage(
        textToSend,
        recipientKeyRef.current,
        selfPublicKeyRef.current,
      );

      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();

      // 2. Add optimistically
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          from_user_id: user!.id,
          to_user_id: recipientId,
          plaintext: textToSend,
          created_at: now,
        },
      ]);

      // 3. Send over WS or fallback
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: "message.send",
            to: recipientId,
            payload,
          }),
        );
      } else {
        // Offline fallback
        const response = await sendMessageOffline(recipientId, payload);
        // Replace temp ID with real ID
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: response.id } : m)),
        );
      }
    } catch (error) {
      showToast((error as Error).message || "Failed to send message", "error");
    } finally {
      setIsSending(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Chat Header */}
      <div className="h-16 border-b border-border bg-surface px-4 md:px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-foreground/70 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </Link>
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shadow-sm">
            {recipientName[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{recipientName}</h2>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span className="text-xs text-foreground/50">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="m-auto text-center text-foreground/50 text-sm">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from_user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] md:max-w-[75%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${isMe ? "self-end items-end" : "self-start items-start"}`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${
                    isMe
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-surface border border-border text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.plaintext}
                </div>
                <span className="text-[10px] text-foreground/40 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface border-t border-border">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type an encrypted message..."
            className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled={!isConnected && false} // allow offline typing maybe?
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
