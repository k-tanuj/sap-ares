"""
Gemini LLM Engine for ARES.

Provides unified calling functions to Google Gemini models (gemini-2.5-flash / gemini-1.5-pro)
with structured JSON extraction and automatic fallback handling.
"""
import os
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def get_gemini_client():
    """Returns an authenticated google-genai Client if GEMINI_API_KEY is set."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.warning(f"Could not initialize google-genai Client: {e}")
        return None


def call_gemini_json(prompt: str, system_instruction: Optional[str] = None, model: str = "gemini-3.6-flash") -> Optional[Dict[str, Any]]:
    """
    Sends a prompt to Google Gemini requesting structured JSON output.
    Returns parsed dictionary or None if Gemini is not configured / fails.
    """
    client = get_gemini_client()
    if not client:
        return None

    try:
        from google.genai import types
        config = types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
            system_instruction=system_instruction
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        if response and response.text:
            return json.loads(response.text)
    except Exception as e:
        logger.warning(f"Gemini API call failed ({e})")
        raise e
