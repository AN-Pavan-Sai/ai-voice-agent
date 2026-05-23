import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Square, Activity } from "lucide-react";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import "./index.css";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recording, setRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Ref to hold the current AI message being streamed
  const currentAiMessageIdRef = useRef<string | null>(null);
  const sentenceBufferRef = useRef<string>("");
  
  const onSilenceDetected = useCallback(async (blob: Blob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const arrayBuffer = await blob.arrayBuffer();
      wsRef.current.send(arrayBuffer);
    }
  }, []);

  const { startRecording: startRecorder, stopRecording: stopRecorder } = useAudioRecorder(onSilenceDetected);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onopen = () => {
      setIsConnected(true);
      console.log("Connected to backend");
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("Disconnected from backend");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "user") {
          // Received user transcript from STT
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", text: data.text }]);
          // Reset AI message tracker for the new turn
          currentAiMessageIdRef.current = null;
          sentenceBufferRef.current = "";
        } 
        else if (data.type === "token") {
          // Received a chunk of AI response
          const token = data.text;
          sentenceBufferRef.current += token;
          
          if (!currentAiMessageIdRef.current) {
            // Create a new AI message
            const newId = Date.now().toString();
            currentAiMessageIdRef.current = newId;
            setMessages(prev => [...prev, { id: newId, sender: "ai", text: token }]);
          } else {
            // Append to existing AI message
            const id = currentAiMessageIdRef.current;
            setMessages(prev => prev.map(msg => 
              msg.id === id ? { ...msg, text: msg.text + token } : msg
            ));
          }
          
          // Check for sentence boundaries to trigger TTS incrementally
          const match = sentenceBufferRef.current.match(/([^.!?]+[.!?]+)(.*)/);
          if (match) {
            const sentence = match[1].trim();
            const remainder = match[2];
            sentenceBufferRef.current = remainder;
            
            if (sentence) {
              const speech = new SpeechSynthesisUtterance(sentence);
              speech.lang = "en-IN"; // matching Sarvam's target language
              window.speechSynthesis.speak(speech);
            }
          }
        }
        else if (data.type === "done") {
          // Speak any remaining text that didn't end with punctuation
          const remaining = sentenceBufferRef.current.trim();
          if (remaining) {
            const speech = new SpeechSynthesisUtterance(remaining);
            speech.lang = "en-IN";
            window.speechSynthesis.speak(speech);
            sentenceBufferRef.current = "";
          }
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleStart = async () => {
    setRecording(true);
    await startRecorder();
  };

  const handleStop = () => {
    setRecording(false);
    stopRecorder();
  };

  return (
    <div className="app-container">
      <div className="glass-panel main-panel">
        <header className="header">
          <div className="status-indicator">
            <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`}></span>
            <span className="status-text">{isConnected ? "System Online" : "Connecting..."}</span>
          </div>
          <h1 className="title">Medical AI Assistant</h1>
          <p className="subtitle">Powered by Sarvam AI & Groq Llama</p>
        </header>

        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <Activity className="empty-icon" />
              <p>Start speaking to consult with the medical assistant.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                <div className="message-bubble">
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="controls">
          {!recording ? (
            <button className="control-btn start-btn" onClick={handleStart} disabled={!isConnected}>
              <Mic className="btn-icon" />
              Start Consultation
            </button>
          ) : (
            <div className="recording-controls">
              <div className="recording-indicator">
                <span className="pulse-ring"></span>
                <span className="pulse-ring delay-1"></span>
                <Mic className="recording-icon" />
                <span>Listening...</span>
              </div>
              <button className="control-btn stop-btn" onClick={handleStop}>
                <Square className="btn-icon" />
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;