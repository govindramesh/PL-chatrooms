"use client";

import { useEffect, useMemo, useState } from "react";

type RoomSummary = {
  id: string;
  roomType: "GENERAL" | "TEAM";
  teamId: number | null;
  label: string;
};

type Message = {
  id: string;
  body: string;
  messageType: "USER" | "SYSTEM_EVENT";
  createdAt: string;
  user: {
    username: string;
  } | null;
};

type ChatPanelProps = {
  rooms: RoomSummary[];
  fixtureId: string;
  initialRoomId: string;
  allowSimulateEvents: boolean;
};

async function fetchMessages(roomId: string): Promise<{ messages: Message[]; expired: boolean }> {
  const response = await fetch(`/api/rooms/${roomId}/messages`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 410) {
    return { messages: [], expired: true };
  }

  if (!response.ok) {
    throw new Error("Failed to load messages");
  }

  return response.json();
}

export function ChatPanel({ rooms, fixtureId, initialRoomId, allowSimulateEvents }: ChatPanelProps) {
  const [activeRoomId, setActiveRoomId] = useState(initialRoomId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? rooms[0],
    [activeRoomId, rooms],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchMessages(activeRoomId);
        if (cancelled) {
          return;
        }
        setMessages(data.messages);
        setExpired(data.expired);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Could not refresh chat right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const handle = window.setInterval(load, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [activeRoomId]);

  async function sendMessage() {
    if (!draft.trim()) {
      return;
    }

    const response = await fetch(`/api/rooms/${activeRoomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });

    if (response.status === 410) {
      setExpired(true);
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not send message.");
      return;
    }

    setDraft("");
    const result = (await response.json()) as { message: Message };
    setMessages((prev) => [...prev, result.message]);
  }

  async function sendSampleEvent() {
    const response = await fetch(`/api/fixtures/${fixtureId}/events/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Goal", minute: Math.floor(Math.random() * 90) + 1 }),
    });

    if (!response.ok) {
      setError("Unable to add sample event.");
      return;
    }

    const data = await fetchMessages(activeRoomId);
    setMessages(data.messages);
    setExpired(data.expired);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap gap-2">
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => setActiveRoomId(room.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              room.id === activeRoomId
                ? "bg-slate-900 text-white"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {room.label}
          </button>
        ))}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{activeRoom?.label} Chat</h3>
        {allowSimulateEvents ? (
          <button
            type="button"
            onClick={() => void sendSampleEvent()}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Add Sample Live Event
          </button>
        ) : null}
      </div>

      {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}

      <div className="h-96 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
        {loading ? <p className="text-sm text-slate-500">Loading chat...</p> : null}
        {!loading && messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
        ) : null}
        <div className="space-y-2">
          {messages.map((message) => {
            const system = message.messageType === "SYSTEM_EVENT";
            return (
              <article
                key={message.id}
                className={`rounded-md p-2 text-sm ${
                  system ? "border border-amber-200 bg-amber-50" : "border border-slate-200 bg-white"
                }`}
              >
                <p className="mb-1 text-xs text-slate-500">
                  {system ? "LIVE EVENT" : message.user?.username ?? "Unknown"} ·{" "}
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-slate-800">{message.body}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={expired}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendMessage();
            }
          }}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-700 focus:outline-none"
          placeholder={expired ? "Chat has expired for this fixture" : "Say something..."}
          maxLength={500}
        />
        <button
          type="button"
          disabled={expired}
          onClick={() => void sendMessage()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Send
        </button>
      </div>
    </section>
  );
}
