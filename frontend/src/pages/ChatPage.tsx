import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { chatOnce, createConversation, getHealth, getModels, getModelStatus, streamChat } from "../services/api";
import type { ChatMessage, ModelInfo } from "../types/api";
import { useEffect } from "react";
import { useUiSettings } from "../lib/uiSettings";

type UiMessage = ChatMessage & { id: string };
type VoiceMode = "wake" | "direct" | null;

export function ChatPage() {
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [localModelIds, setLocalModelIds] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("auto");
  const [chatReady, setChatReady] = useState(false);
  const [readinessMessage, setReadinessMessage] = useState("Checking local AI runtime...");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice ready when enabled.");
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceModeRef = useRef<VoiceMode>(null);
  const shouldResumeWakeRef = useRef(false);
  const { settings } = useUiSettings();

  function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") {
      return null;
    }
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function stopVoiceListening(manual = true) {
    shouldResumeWakeRef.current = false;
    if (manual) {
      voiceModeRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      recognitionRef.current = null;
    }
    setVoiceListening(false);
  }

  function startVoiceListening(mode: Exclude<VoiceMode, null>) {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor || !settings.voiceEnabled) {
      setVoiceStatus("Voice input is unavailable on this device.");
      return;
    }

    const existing = recognitionRef.current;
    if (existing) {
      shouldResumeWakeRef.current = false;
      existing.stop();
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = mode === "direct";
    recognition.continuous = mode === "wake";
    voiceModeRef.current = mode;
    shouldResumeWakeRef.current = mode === "wake";

    recognition.onstart = () => {
      setVoiceListening(true);
      setVoiceStatus(mode === "wake" ? 'Listening for “Hi Jae”…' : "Listening for your voice...");
    };

    recognition.onresult = (event) => {
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) {
          continue;
        }

        if (mode === "wake") {
          const match = transcript.toLowerCase().match(/\bhi\s+jae\b[\s,:-]*(.*)/i);
          if (result.isFinal && match) {
            const afterWake = match[1]?.trim() || "";
            setVoiceStatus("Wake phrase heard. Speak now.");
            stopVoiceListening(false);
            voiceModeRef.current = null;
            if (afterWake) {
              setInput((prev) => `${prev}${prev ? " " : ""}${afterWake}`.trim());
            }
            window.setTimeout(() => startVoiceListening("direct"), 120);
            return;
          }
          continue;
        }

        if (result.isFinal) {
          setInput((prev) => `${prev}${prev ? " " : ""}${transcript}`.trim());
          setVoiceStatus("Voice captured. You can keep speaking or send the message.");
        } else {
          interimText = transcript;
        }
      }

      if (interimText) {
        setVoiceStatus(`Listening: ${interimText}`);
      }
    };

    recognition.onerror = () => {
      setVoiceStatus("Voice input hit an issue. Try the button again.");
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      const shouldResumeWake = shouldResumeWakeRef.current && settings.voiceEnabled && settings.voiceWakePhraseEnabled && chatReady;
      setVoiceListening(false);
      recognitionRef.current = null;
      if (shouldResumeWake) {
        window.setTimeout(() => startVoiceListening("wake"), 250);
        return;
      }
      if (voiceModeRef.current === "direct") {
        setVoiceStatus("Voice stopped. Review your message or tap the mic again.");
      } else if (settings.voiceEnabled && settings.voiceWakePhraseEnabled && chatReady) {
        setVoiceStatus('Wake phrase listening is armed for “Hi Jae”.');
      } else {
        setVoiceStatus("Voice is off.");
      }
      voiceModeRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      settings.showChatModelPicker
        ? getModels().then((res) => (res.data.models as ModelInfo[]) || [])
        : Promise.resolve([] as ModelInfo[]),
      getModelStatus(),
      getHealth(),
    ])
      .then(([availableModels, statusRes, healthRes]) => {
        if (cancelled) {
          return;
        }
        setModels(availableModels);
        const local = ((statusRes.data.models as Array<{ id: string; exists: boolean }>) || [])
          .filter((m) => m.exists)
          .map((m) => m.id);
        setLocalModelIds(local);
        const inference = (healthRes.data.inference || {}) as { ok?: boolean; message?: string };
        if (local.length === 0) {
          setChatReady(false);
          setReadinessMessage("Install at least one local model in Models before starting a chat.");
          return;
        }
        if (!inference.ok) {
          setChatReady(false);
          setReadinessMessage(`Local AI runtime is offline: ${inference.message || "provider unavailable"}.`);
          return;
        }
        setChatReady(true);
        setReadinessMessage("Local AI runtime is ready.");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setModels([]);
        setLocalModelIds([]);
        setChatReady(false);
        setReadinessMessage("Unable to verify local AI runtime status.");
      });

    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    if (!voiceSupported) {
      setVoiceStatus("Voice input is unavailable on this device.");
      return;
    }

    if (!settings.voiceEnabled) {
      stopVoiceListening();
      setVoiceStatus("Voice is turned off in Settings.");
      return;
    }

    if (!chatReady || streaming) {
      stopVoiceListening(false);
      setVoiceStatus(chatReady ? "Voice waits until streaming is finished." : readinessMessage);
      return;
    }

    if (settings.voiceWakePhraseEnabled && voiceModeRef.current !== "wake" && !voiceListening) {
      startVoiceListening("wake");
      return;
    }

    if (!settings.voiceWakePhraseEnabled && voiceModeRef.current === "wake") {
      stopVoiceListening();
      setVoiceStatus("Wake phrase listening is off.");
    }
  }, [chatReady, readinessMessage, settings.voiceEnabled, settings.voiceWakePhraseEnabled, streaming, voiceListening, voiceSupported]);

  useEffect(() => () => stopVoiceListening(), []);

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
    if (!text || streaming || !chatReady) {
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

  function onVoiceButtonClick() {
    if (!voiceSupported || !settings.voiceEnabled || !chatReady) {
      return;
    }
    inputRef.current?.focus();
    if (voiceModeRef.current === "direct") {
      stopVoiceListening();
      setVoiceStatus("Voice dictation stopped.");
      return;
    }
    startVoiceListening("direct");
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
          <p className="muted">{chatReady ? "Start a chat to test model routing and streaming output." : readinessMessage}</p>
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
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={chatReady ? "Ask JAE anything..." : readinessMessage}
          rows={3}
          disabled={!chatReady || streaming}
        />
        <div className="chat-actions">
          <button
            className={`voice-button${voiceModeRef.current === "direct" ? " voice-button-live" : ""}`}
            type="button"
            onClick={onVoiceButtonClick}
            disabled={!voiceSupported || !settings.voiceEnabled || !chatReady || streaming}
          >
            {voiceModeRef.current === "direct" ? "Stop Voice" : "Voice"}
          </button>
          <button className="chat-send" type="submit" disabled={!chatReady || streaming}>
            {streaming ? "Streaming..." : "Send"}
          </button>
        </div>
        <p className="muted chat-hint voice-status" style={{ margin: 0 }}>
          {voiceStatus}
        </p>
        <p className="muted chat-hint" style={{ margin: 0 }}>
          {capabilityNotes.join(". ") + "."}
        </p>
      </form>
    </section>
  );
}
