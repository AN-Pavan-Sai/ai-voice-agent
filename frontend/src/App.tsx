import { useEffect, useRef, useState } from "react";

function App() {

  const [messages, setMessages] = useState<string[]>([]);

  const [recording, setRecording] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {

    const ws = new WebSocket(
      "ws://127.0.0.1:8000/ws"
    );

    ws.onopen = () => {
      console.log("Connected");
    };

    ws.onmessage = (event) => {

      const aiText = event.data;

      setMessages(prev => [
        ...prev,
        `AI: ${aiText}`
      ]);

      // Browser TTS
      const speech =
        new SpeechSynthesisUtterance(aiText);

      speech.lang = "en-US";

      window.speechSynthesis.speak(speech);
    };

    wsRef.current = ws;

    return () => ws.close();

  }, []);

  const startRecording = async () => {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    const mediaRecorder =
      new MediaRecorder(stream, {
        mimeType: "audio/webm"
      });

    mediaRecorderRef.current =
      mediaRecorder;

    chunksRef.current = [];

    mediaRecorder.ondataavailable =
      (event) => {

        if (event.data.size > 0) {

          chunksRef.current.push(event.data);
        }
      };

    // Every 5 sec create COMPLETE webm
    mediaRecorder.onstop = async () => {

      const blob = new Blob(
        chunksRef.current,
        {
          type: "audio/webm"
        }
      );

      const arrayBuffer =
        await blob.arrayBuffer();

      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {

        wsRef.current.send(arrayBuffer);

        console.log("Sent complete audio");
      }

      chunksRef.current = [];

      // Restart automatically
      if (recording) {

        mediaRecorder.start();

        setTimeout(() => {
          mediaRecorder.stop();
        }, 5000);
      }
    };

    setRecording(true);

    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000);
  };

  const stopRecording = () => {

    setRecording(false);

    mediaRecorderRef.current?.stop();
  };

  return (
    <div
      style={{
        background: "#0f172a",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
        textAlign: "center"
      }}
    >

      <h1
        style={{
          fontSize: "60px"
        }}
      >
        Multilingual Voice Agent
      </h1>

      {
        !recording ? (
          <button onClick={startRecording}>
            Start Talking
          </button>
        ) : (
          <button onClick={stopRecording}>
            Stop Talking
          </button>
        )
      }

      <div
        style={{
          marginTop: "40px"
        }}
      >

        {
          messages.map((msg, i) => (
            <p key={i}>
              {msg}
            </p>
          ))
        }

      </div>

    </div>
  );
}

export default App;