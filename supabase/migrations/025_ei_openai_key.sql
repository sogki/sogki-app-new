-- Ei assistant TTS (OpenAI) — server-only key
INSERT INTO public.keys (key, value, is_public, description) VALUES
  (
    'OPENAI_API_KEY',
    'REPLACE_ME',
    false,
    'OpenAI API key for Ei neural TTS (admin ei-speak function)'
  )
ON CONFLICT (key) DO NOTHING;
