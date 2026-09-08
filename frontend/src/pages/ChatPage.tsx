import { FormEvent, useState } from "react";
import { createConversation, getModels, getModelStatus, streamChat } from "../services/api";
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

    const cid = await ensureConversation();
    const userMessage: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);

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
        onError(error) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: `Streaming error: ${error}` }
                : m
            )
          );
          setStreaming(false);
        },
      }
    );
  }

  return (
    <section className="page chat-page">
      <div className="panel chat-log">
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
              <p className="muted" style={{ margin: "0 0 8px" }}>
                No local models installed yet. Open Models and download one or more to enable manual switching.
              </p>
            )}
          </>
        )}
        {!settings.showChatModelPicker && (
          <p className="muted" style={{ margin: "0 0 8px" }}>
            Model and task behavior are managed in Settings.
          </p>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask JAE AI anything..."
          rows={3}
        />
        <button type="submit" disabled={streaming}>
          {streaming ? "Streaming..." : "Send"}
        </button>
      </form>
    </section>
  );
}
