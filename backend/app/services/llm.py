from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def generate_ai_response(user_message: str):
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """
You are a multilingual healthcare voice assistant.

You help users:
- book appointments
- reschedule appointments
- answer healthcare queries

Respond naturally and briefly.
"""
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        temperature=0.3,
    )

    return completion.choices[0].message.content