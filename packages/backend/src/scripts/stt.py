#!/usr/bin/env python3
"""
Speech-to-text service using Vosk.
Reads audio from stdin (WAV format) and outputs JSON with transcription.
"""

import sys
import json
import wave
import os
from vosk import Model, KaldiRecognizer

MODEL_PATH = os.path.expanduser("~/.local/share/vosk/vosk-model-small-en-us-0.15")

def transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio file using Vosk."""
    try:
        if not os.path.exists(MODEL_PATH):
            return {"success": False, "error": "Vosk model not found"}

        model = Model(MODEL_PATH)

        wf = wave.open(audio_path, "rb")

        if wf.getnchannels() != 1:
            return {"success": False, "error": "Audio must be mono"}

        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)

        results = []
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                if result.get("text"):
                    results.append(result["text"])

        # Get final result
        final = json.loads(rec.FinalResult())
        if final.get("text"):
            results.append(final["text"])

        wf.close()

        text = " ".join(results).strip()
        return {"success": True, "text": text}

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: stt.py <audio_file>"}))
        sys.exit(1)

    audio_file = sys.argv[1]

    if not os.path.exists(audio_file):
        print(json.dumps({"success": False, "error": f"File not found: {audio_file}"}))
        sys.exit(1)

    result = transcribe_audio(audio_file)
    print(json.dumps(result))
