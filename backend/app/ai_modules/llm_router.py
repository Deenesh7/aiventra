"""
Hybrid LLM router for AIVENTRA — public-deployment edition.

Provider priority (each one is tried, fall through on failure):
  1. Gemini 1.5 Flash    — cloud, free 15 RPM/1500/day, requires GEMINI_API_KEY
  2. Hugging Face        — cloud, free monthly credits, requires HF_TOKEN
  3. Ollama TinyLlama    — local, unlimited, requires `ollama serve`
  4. Templated fallback  — always-on, no LLM, returns a helpful placeholder

Built-in safeguards:
  • In-memory LRU cache (1 hour TTL) — identical prompts skip the LLM entirely
  • Exponential backoff on rate-limited HF responses (handles 429 + 503)
  • Cold-start retry — HF returns 503 "Model is loading" with estimated_time
  • Per-provider timeouts so a stuck call doesn't hang the API request
  • Health probe lets the frontend see which provider is active

The router is intentionally provider-agnostic: every public function returns
a uniform shape, so callers don't have to care which model answered.
"""
from __future__ import annotations
import os
import time
import json
import re
import hashlib
from collections import OrderedDict
from typing import Optional

from app.core.config import settings

# VULN-017 fix: route all secrets through the Pydantic settings model (SecretStr)
_GEMINI_KEY = settings.GEMINI_API_KEY.get_secret_value().strip()
_HF_TOKEN = settings.HF_TOKEN.get_secret_value().strip()
_HF_MODEL = settings.HF_MODEL.strip()
_HF_FALLBACK_MODEL = settings.HF_FALLBACK_MODEL.strip()
_OLLAMA_MODEL = settings.OLLAMA_MODEL.strip()

_GEMINI_READY = False
_HF_READY = False
_OLLAMA_READY = False

# Gemini
try:
    if _GEMINI_KEY:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=_GEMINI_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
        _GEMINI_READY = True
        print(f"[llm] Gemini ready ({settings.GEMINI_MODEL})")
except Exception as e:
    print(f"[llm] Gemini init failed: {e}")

# Hugging Face — uses httpx (already a dependency)
try:
    import httpx  # type: ignore
    if _HF_TOKEN:
        _HF_READY = True
        print(f"[llm] Hugging Face ready ({_HF_MODEL})")
except Exception as e:
    print(f"[llm] httpx unavailable, HF disabled: {e}")

# Ollama (local)
try:
    import ollama  # type: ignore
    try:
        ollama.list()
        _OLLAMA_READY = True
        print(f"[llm] Ollama ready ({_OLLAMA_MODEL})")
    except Exception as e:
        print(f"[llm] Ollama daemon unreachable: {e}")
except Exception:
    print("[llm] ollama package not installed")


# ─── Tiny LRU cache for identical prompts ─────────────────────────────────
class _LRUCache:
    def __init__(self, capacity: int = 256, ttl_seconds: int = 3600):
        self.capacity = capacity
        self.ttl = ttl_seconds
        self._store: OrderedDict[str, tuple[float, dict]] = OrderedDict()

    def _key(self, prompt: str, system: Optional[str], max_tokens: int) -> str:
        h = hashlib.sha256()
        h.update((system or "").encode())
        h.update(b"|")
        h.update(prompt.encode())
        h.update(b"|")
        h.update(str(max_tokens).encode())
        return h.hexdigest()

    def get(self, prompt, system, max_tokens):
        k = self._key(prompt, system, max_tokens)
        item = self._store.get(k)
        if not item:
            return None
        ts, val = item
        if time.time() - ts > self.ttl:
            del self._store[k]
            return None
        self._store.move_to_end(k)
        return val

    def set(self, prompt, system, max_tokens, value):
        k = self._key(prompt, system, max_tokens)
        self._store[k] = (time.time(), value)
        self._store.move_to_end(k)
        if len(self._store) > self.capacity:
            self._store.popitem(last=False)


_cache = _LRUCache()


# ─── HF Inference API call with retry/backoff ─────────────────────────────
def _call_hf(prompt: str, system: Optional[str], max_tokens: int, model: str) -> Optional[str]:
    """
    Call the HF Serverless Inference API with proper backoff handling.

    Returns the generated text on success, None on permanent failure.
    Distinguishes between:
      • 200    — success
      • 429    — rate limited → exponential backoff and retry
      • 503    — model loading → wait estimated_time and retry
      • 4xx    — bad request, no point retrying
      • 5xx    — server issue, retry once
    """
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {_HF_TOKEN}"}

    # Chat-template format works for instruct models like Qwen, Llama, Mistral, Phi
    full_prompt = f"<|system|>\n{system}<|end|>\n<|user|>\n{prompt}<|end|>\n<|assistant|>\n" if system else prompt

    payload = {
        "inputs": full_prompt,
        "parameters": {
            "max_new_tokens": max_tokens,
            "temperature": 0.3,
            "return_full_text": False,
            "do_sample": True,
        },
        "options": {
            "wait_for_model": True,    # let HF spin up cold models
            "use_cache": True,
        },
    }

    delays = [2, 4, 8, 16]  # exponential backoff in seconds
    for attempt in range(len(delays) + 1):
        try:
            with httpx.Client(timeout=120.0) as client:
                r = client.post(url, headers=headers, json=payload)

            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list) and data and isinstance(data[0], dict):
                    return data[0].get("generated_text", "").strip()
                if isinstance(data, dict) and "generated_text" in data:
                    return data["generated_text"].strip()
                # some models return a list of strings
                if isinstance(data, list) and data and isinstance(data[0], str):
                    return data[0].strip()
                print(f"[llm] HF returned unexpected shape: {type(data).__name__}")
                return None

            if r.status_code == 503:
                # Cold start — HF tells us the estimated load time
                try:
                    eta = r.json().get("estimated_time", 20)
                except Exception:
                    eta = 20
                wait = min(eta, 60)
                print(f"[llm] HF model cold-starting, waiting {wait}s (attempt {attempt + 1})")
                if attempt < len(delays):
                    time.sleep(wait)
                    continue
                return None

            if r.status_code == 429:
                # Rate limited
                wait = delays[attempt] if attempt < len(delays) else delays[-1]
                print(f"[llm] HF rate limit hit, backing off {wait}s (attempt {attempt + 1})")
                if attempt < len(delays):
                    time.sleep(wait)
                    continue
                return None

            if 400 <= r.status_code < 500:
                # Permanent — don't retry
                print(f"[llm] HF client error {r.status_code}: {r.text[:200]}")
                return None

            # 5xx — one retry
            if attempt < 1:
                print(f"[llm] HF server error {r.status_code}, retrying once")
                time.sleep(delays[0])
                continue
            return None

        except httpx.TimeoutException:
            if attempt < len(delays):
                print(f"[llm] HF timeout, backing off (attempt {attempt + 1})")
                time.sleep(delays[attempt])
                continue
            return None
        except Exception as e:
            print(f"[llm] HF call failed: {e}")
            return None

    return None


# ─── Public API ───────────────────────────────────────────────────────────
def complete(prompt: str, system: Optional[str] = None, max_tokens: int = 1500) -> dict:
    """
    Run a chat completion through the best available provider.

    Returns:
      {
        "text": str,
        "provider": "gemini" | "huggingface" | "ollama" | "fallback",
        "model": str,
        "inference_ms": int,
        "cached": bool,
      }
    """
    start = time.time()

    # 0) Cache hit
    cached = _cache.get(prompt, system, max_tokens)
    if cached:
        return {**cached, "cached": True, "inference_ms": int((time.time() - start) * 1000)}

    # 1) Ollama local
    if _OLLAMA_READY:
        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            response = ollama.chat(model=_OLLAMA_MODEL, messages=messages)
            text = (response.get("message", {}).get("content") or "").strip()
            if text:
                out = {
                    "text": text,
                    "provider": "ollama",
                    "model": _OLLAMA_MODEL,
                    "inference_ms": int((time.time() - start) * 1000),
                    "cached": False,
                }
                _cache.set(prompt, system, max_tokens, out)
                return out
        except Exception as e:
            print(f"[llm] Ollama failed, falling through: {e}")

    # 2) Gemini
    if _GEMINI_READY:
        try:
            content = prompt if not system else f"{system}\n\n{prompt}"
            result = _gemini_model.generate_content(
                content,
                generation_config={"temperature": 0.3, "max_output_tokens": max_tokens},
            )
            text = (result.text or "").strip()
            if text:
                out = {
                    "text": text,
                    "provider": "gemini",
                    "model": settings.GEMINI_MODEL,
                    "inference_ms": int((time.time() - start) * 1000),
                    "cached": False,
                }
                _cache.set(prompt, system, max_tokens, out)
                return out
        except Exception as e:
            print(f"[llm] Gemini failed, falling through: {e}")

    # 3) Hugging Face Inference API
    if _HF_READY:
        for model in (_HF_MODEL, _HF_FALLBACK_MODEL):
            text = _call_hf(prompt, system, max_tokens, model)
            if text:
                out = {
                    "text": text,
                    "provider": "huggingface",
                    "model": model,
                    "inference_ms": int((time.time() - start) * 1000),
                    "cached": False,
                }
                _cache.set(prompt, system, max_tokens, out)
                return out

    # 4) Templated fallback
    return {
        "text": _fallback_text(),
        "provider": "fallback",
        "model": "templated",
        "inference_ms": int((time.time() - start) * 1000),
        "cached": False,
    }


def complete_json(prompt: str, system: Optional[str] = None, max_tokens: int = 2000) -> dict:
    instruction = (
        "Respond with STRICT, VALID JSON only. No markdown fences. "
        "No preamble. Begin with { or [ and end with } or ]."
    )
    full_system = f"{system}\n\n{instruction}" if system else instruction
    result = complete(prompt, system=full_system, max_tokens=max_tokens)
    data, err = _extract_json(result["text"])
    return {
        "data": data,
        "raw_text": result["text"],
        "provider": result["provider"],
        "model": result["model"],
        "inference_ms": result["inference_ms"],
        "cached": result.get("cached", False),
        "parse_error": err,
    }


def provider_status() -> dict:
    return {
        "gemini": _GEMINI_READY,
        "huggingface": _HF_READY,
        "hf_model": _HF_MODEL if _HF_READY else None,
        "ollama": _OLLAMA_READY,
        "ollama_model": _OLLAMA_MODEL if _OLLAMA_READY else None,
        "active": (
            "gemini" if _GEMINI_READY
            else "huggingface" if _HF_READY
            else "ollama" if _OLLAMA_READY
            else "fallback"
        ),
        "cache_size": len(_cache._store),
    }


# ─── Helpers ──────────────────────────────────────────────────────────────
def _extract_json(text: str) -> tuple[Optional[object], Optional[str]]:
    if not text:
        return None, "empty response"
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    try:
        return json.loads(cleaned), None
    except Exception:
        pass
    for opener, closer in [("{", "}"), ("[", "]")]:
        start, end = cleaned.find(opener), cleaned.rfind(closer)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start:end + 1]), None
            except Exception:
                continue
    return None, "could not parse JSON"


def _fallback_text() -> str:
    return (
        "AI analysis is currently unavailable. To enable forensic reasoning, set one "
        "of the following in backend/.env:\n"
        "  • GEMINI_API_KEY  (free, https://aistudio.google.com/app/apikey)\n"
        "  • HF_TOKEN        (free, https://huggingface.co/settings/tokens)\n"
        "  • Or run a local Ollama instance (https://ollama.com)\n"
        "The platform will automatically use the best available provider on the next request."
    )
