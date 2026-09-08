import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { chatOnce, createConversation, getModels, getModelStatus, streamChat } from "../services/api";
import type { ChatMessage, ModelInfo } from "../types/api";
import { useEffect } from "react";
import { useUiSettings } from "../lib/uiSettings";

type UiMessage = ChatMessage & { id: string };

export function ChatPage() {
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [localModelIds, setLocalModelIds] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("auto");
  const logRef = useRef<HTMLDivElement | null>(null);
  const { settings } = useUiSettings();

  useEffect(() => {
    if (!settings.showChatModelPicker) {
      return;
    }
    getModels().then((res) => setModels((res.data.models as ModelInfo[]) || [])).catch(() => setModels([]));
    getModelStatus()
      .then((res) => {
        const local = ((res.data.models as Array<{ id: string; exists: boolean }>) || [])
          .filter((m) => m.exists)
          .map((m) => m.id);
        setLocalModelIds(local);
      })
      .catch(() => setLocalModelIds([]));
  }, [settings.showChatModelPicker]);

  useEffect(() => {
    setSelectedModelId(settings.preferredModelId || "auto");
  }, [settings.preferredModelId]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) {
      return;
    }
    log.scrollTop = log.scrollHeight;
  }, [messages, streaming]);

  async function ensureConversation(): Promise<number> {
    if (conversationId) {
      return conversationId;
    }
    const created = await createConversation();
    const id = created.data.conversation_id;
    setConversationId(id);
    return id;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || streaming) {
      return;
    }
    const userMessage: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [...prev, userMessage, { id: assistantMessageId, role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const cid = await ensureConversation();
      const payloadMessages: ChatMessage[] = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      streamChat(
        {
          conversation_id: cid,
          messages: payloadMessages,
          task_type: settings.defaultTaskType,
          model_id: selectedModelId !== "auto" ? selectedModelId : undefined,
        },
        {
          onToken(token) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessageId ? { ...m, content: m.content + token } : m))
            );
          },
          onDone(done) {
            setConversationId(done.conversation_id);
            setStreaming(false);
          },
          onError() {
            chatOnce({
              conversation_id: cid,
              messages: payloadMessages,
              task_type: settings.defaultTaskType,
              model_id: selectedModelId !== "auto" ? selectedModelId : undefined,
            })
              .then((res) => {
                const reply = res.data.response || "";
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMessageId ? { ...m, content: reply } : m))
                );
                setConversationId(res.data.conversation_id);
              })
              .catch((fallbackErr: Error) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: `AI runtime is temporarily unavailable. Details: ${fallbackErr.message}` }
                      : m
                  )
                );
              })
              .finally(() => {
                setStreaming(false);
              });
          },
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start chat";
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMessageId ? { ...m, content: `Connection error: ${message}` } : m))
      );
      setStreaming(false);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  }

  const capabilityNotes: string[] = [];
  if (settings.filesLocalOnly) {
    capabilityNotes.push("Files stay local-only");
  } else {
    capabilityNotes.push("File access mode is not limited to local-only");
  }
  if (settings.internetResearchEnabled) {
    capabilityNotes.push("JAE can browse and scan the internet for information");
  } else {
    capabilityNotes.push("Internet browsing and scanning is currently disabled");
  }
  if (settings.freeModelAccess) {
    capabilityNotes.push("Selected AI models are open and free to use with no API keys required");
  }

  return (
    <section className="page chat-page">
      <div className="panel chat-log" ref={logRef}>
        {messages.length === 0 ? (
          <p className="muted">Start a chat to test model routing and streaming output.</p>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={`msg ${m.role}`}>
              <strong>{m.role}</strong>
              <p>{m.content || (m.role === "assistant" && streaming ? "..." : "")}</p>
            </article>
          ))
        )}
      </div>
      <form className="chat-form" onSubmit={onSubmit}>
        {settings.showChatModelPicker && (
          <>
            <label className="muted">
              Model
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                style={{ marginLeft: "8px", marginBottom: "8px" }}
              >
                <option value="auto">Auto (recommended for this device)</option>
                {models
                  .filter((m) => localModelIds.includes(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
              </select>
            </label>
            {localModelIds.length === 0 && (
              <p className="muted chat-hint" style={{ margin: "0 0 8px" }}>
                No local models installed yet. Open Models and download one or more to enable manual switching.
              </p>
            )}
          </>
        )}
        {!settings.showChatModelPicker && (
          <p className="muted chat-hint" style={{ margin: "0 0 8px" }}>
            Model and task behavior are managed in Settings.
          </p>
        )}
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Ask JAE AI anything..."
          rows={3}
        />
        <button className="chat-send" type="submit" disabled={streaming}>
          {streaming ? "Streaming..." : "Send"}
        </button>
        <p className="muted chat-hint" style={{ margin: 0 }}>
          {capabilityNotes.join(". ") + "."}
        </p>
      </form>
    </section>
  );
}
