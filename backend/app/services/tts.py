import requests


SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"


def generate_speech(text: str, api_key: str):

    payload = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": "anushka",
        "pitch": 0,
        "pace": 1.0,
        "loudness": 1.0,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": "bulbul:v2"
    }

    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }

    response = requests.post(
        SARVAM_TTS_URL,
        json=payload,
        headers=headers
    )

    return response.json()