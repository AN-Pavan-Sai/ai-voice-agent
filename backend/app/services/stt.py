import requests
import tempfile
import os

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"


def transcribe_audio(audio_bytes: bytes, api_key: str):

    temp_audio_path = None

    try:

        # Save incoming audio chunk as proper webm file
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".webm"
        ) as temp_audio:

            temp_audio.write(audio_bytes)

            temp_audio.flush()

            temp_audio_path = temp_audio.name

        headers = {
            "api-subscription-key": api_key
        }

        files = {
            "file": (
                "audio.webm",
                open(temp_audio_path, "rb"),
                "audio/webm"
            )
        }

        response = requests.post(
            SARVAM_STT_URL,
            headers=headers,
            files=files,
            timeout=60
        )

        print("STT STATUS:", response.status_code)
        print("STT RESPONSE:", response.text)

        return response.json()

    except Exception as e:

        print("STT ERROR:", str(e))

        return {
            "error": str(e)
        }

    finally:

        # Cleanup temp file
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)