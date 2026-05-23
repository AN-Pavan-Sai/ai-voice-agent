from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
import os

from app.services.stt import transcribe_audio
from app.services.llm import generate_ai_response

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

app = FastAPI()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await websocket.accept()

    print("Client connected")

    try:

        while True:

            data = await websocket.receive_bytes()

            print("Audio received:",
                  len(data))

            stt_result = transcribe_audio(
                data,
                SARVAM_API_KEY
            )

            print("STT:", stt_result)

            transcript = stt_result.get(
                "transcript",
                ""
            )

            if transcript:

                print("User:", transcript)

                ai_response = (
                    generate_ai_response(
                        transcript
                    )
                )

                print("AI:", ai_response)

                await websocket.send_text(
                    ai_response
                )

    except WebSocketDisconnect:

        print("Client disconnected")