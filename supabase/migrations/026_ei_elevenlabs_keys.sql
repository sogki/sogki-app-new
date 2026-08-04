-- Ei voice providers (server-only)
INSERT INTO public.keys (key, value, is_public, description) VALUES
  (
    'ELEVENLABS_API_KEY',
    'REPLACE_ME',
    false,
    'ElevenLabs API key for Ei natural TTS (preferred over OpenAI)'
  ),
  (
    'ELEVENLABS_VOICE_ID',
    'EXAVITQu4vr4xnSDxMaL',
    false,
    'ElevenLabs voice id for Ei (default: Sarah). Pick a female voice in ElevenLabs dashboard.'
  )
ON CONFLICT (key) DO NOTHING;
