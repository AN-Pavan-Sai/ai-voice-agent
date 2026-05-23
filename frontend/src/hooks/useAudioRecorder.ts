import { useRef, useCallback } from "react";

export const useAudioRecorder = (onSilenceDetected: (blob: Blob) => void) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const hasSpokenRef = useRef<boolean>(false);
  
  const SILENCE_THRESHOLD = 20;
  const SILENCE_DURATION = 1000; // ms of silence before triggering send

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      
      source.connect(analyser);
      analyserRef.current = analyser;
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      chunksRef.current = [];
      hasSpokenRef.current = false;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        // Only send the audio if the user actually spoke during this recording chunk
        if (blob.size > 0 && hasSpokenRef.current) {
          onSilenceDetected(blob);
        }
        
        chunksRef.current = [];
        hasSpokenRef.current = false; // Reset for the next chunk
        
        // Restart recording if stream is still active
        if (streamRef.current && streamRef.current.active) {
            mediaRecorder.start();
        }
      };
      
      mediaRecorder.start();
      
      const checkAudioLevel = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / dataArrayRef.current.length;
        
        if (average < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
             if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                 mediaRecorderRef.current.stop();
                 silenceStartRef.current = null;
             }
          }
        } else {
          hasSpokenRef.current = true;
          silenceStartRef.current = null;
        }
        
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      
      checkAudioLevel();
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  return { startRecording, stopRecording };
};