-- ENV_ONLY_MODE Patch for MIRA Cloud Run Deployment
-- This updates internal_llm to use Anthropic instead of OpenRouter/Groq
-- Run after mira_service_schema.sql to override default configs

-- Update analysis model to use Claude Haiku (cost-effective for fingerprints)
UPDATE internal_llm 
SET model = 'claude-haiku-4-5',
    endpoint_url = 'https://api.anthropic.com/v1/messages',
    api_key_name = 'anthropic_key',
    description = 'Model for fingerprint generation and memory evacuation (ENV_ONLY_MODE: using Anthropic)'
WHERE name = 'analysis';

-- Update injection_defense to use Claude Haiku
UPDATE internal_llm 
SET model = 'claude-haiku-4-5',
    endpoint_url = 'https://api.anthropic.com/v1/messages',
    api_key_name = 'anthropic_key',
    description = 'Model for prompt injection detection (ENV_ONLY_MODE: using Anthropic)'
WHERE name = 'injection_defense';
