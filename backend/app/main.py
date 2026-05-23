from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
import os
import json

from app.services.stt import transcribe_audio
from app.services.llm import generate_ai_response

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    
    messages = [
        {
            "role": "system",
            "content": """
You are a highly dynamic, empathetic, and conversational multilingual healthcare voice assistant.
Your goal is to have natural, engaging, and varied interactions with patients. 
- Avoid repeating the exact same phrases or greetings.
- Keep the conversation flowing smoothly and human-like.
- You can help users book appointments, reschedule, or answer healthcare queries.
Respond naturally and briefly (1-2 sentences max) in the exact language the user speaks to you. 
Do not use asterisks or markdown in your response.
"""
        }
    ]

    try:
        while True:
            data = await websocket.receive_bytes()
            print("Audio received:", len(data))

            stt_result = transcribe_audio(data, SARVAM_API_KEY)
            transcript = stt_result.get("transcript", "")
            
            clean_t = transcript.strip()
            
            # Filter out empty space, just punctuation, or very short noise hallucinations
            if len(clean_t) > 1 and any(c.isalpha() for c in clean_t):
                print("User:", transcript)
                await websocket.send_text(json.dumps({"type": "user", "text": transcript}))
                
                messages.append({"role": "user", "content": transcript})

                stream = generate_ai_response(messages)
                
                ai_full_response = ""
                for chunk in stream:
                    token = chunk.choices[0].delta.content
                    if token:
                        ai_full_response += token
                        await websocket.send_text(json.dumps({"type": "token", "text": token}))
                
                await websocket.send_text(json.dumps({"type": "done"}))
                print("AI:", ai_full_response)
                messages.append({"role": "assistant", "content": ai_full_response})

    except WebSocketDisconnect:
        print("Client disconnected")