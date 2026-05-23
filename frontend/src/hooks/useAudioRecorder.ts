import { useRef } from "react";

export const useAudioRecorder = () => {

    const mediaRecorderRef =
        useRef<MediaRecorder | null>(null);

    const streamRef =
        useRef<MediaStream | null>(null);

    const startRecording = async (
        socket: WebSocket
    ) => {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        streamRef.current = stream;

        const mediaRecorder =
            new MediaRecorder(stream, {
                mimeType: "audio/webm"
            });

        mediaRecorderRef.current =
            mediaRecorder;

        mediaRecorder.ondataavailable =
            async (event) => {

                if (
                    event.data.size > 0 &&
                    socket.readyState === WebSocket.OPEN
                ) {

                    const arrayBuffer =
                        await event.data.arrayBuffer();

                    socket.send(arrayBuffer);
                }
            };

        // continuous chunks
        mediaRecorder.start(1000);
    };

    const stopRecording = () => {

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {

            streamRef.current
                .getTracks()
                .forEach(track => track.stop());
        }
    };

    return {
        startRecording,
        stopRecording
    };
};