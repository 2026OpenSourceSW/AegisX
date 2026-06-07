package config

import (
	"regexp"
	"strings"

	"github.com/vxcontrol/cloud/anonymizer/patterns"
)

// GetSecretPatterns returns a list of patterns for all secrets in the config.
func (c *Config) GetSecretPatterns() []patterns.Pattern {
	var result []patterns.Pattern

	secrets := []struct {
		value string
		name  string
	}{
		{c.DatabaseURL, "Database URL"},
		{c.LicenseKey, "License Key"},
		{c.CookieSigningSalt, "Cookie Salt"},
		{c.OpenAIKey, "OpenAI Key"},
		{c.AnthropicAPIKey, "Anthropic Key"},
		{c.EmbeddingKey, "Embedding Key"},
		{c.LLMServerKey, "LLM Server Key"},
		{c.OllamaServerAPIKey, "Ollama Key"},
		{c.GeminiAPIKey, "Gemini Key"},
		{c.BedrockBearerToken, "Bedrock Token"},
		{c.BedrockAccessKey, "Bedrock Access Key"},
		{c.BedrockSecretKey, "Bedrock Secret Key"},
		{c.BedrockSessionToken, "Bedrock Session Token"},
		{c.DeepSeekAPIKey, "DeepSeek Key"},
		{c.GLMAPIKey, "GLM Key"},
		{c.KimiAPIKey, "Kimi Key"},
		{c.QwenAPIKey, "Qwen Key"},
		{c.GoogleAPIKey, "Google API Key"},
		{c.GoogleCXKey, "Google CX Key"},
		{c.OAuthGoogleClientID, "Google Client ID"},
		{c.OAuthGoogleClientSecret, "Google Client Secret"},
		{c.OAuthGithubClientID, "Github Client ID"},
		{c.OAuthGithubClientSecret, "Github Client Secret"},
		{c.TraversaalAPIKey, "Traversaal Key"},
		{c.TavilyAPIKey, "Tavily Key"},
		{c.PerplexityAPIKey, "Perplexity Key"},
		{c.ProxyURL, "Proxy URL"},
		{c.LangfusePublicKey, "Langfuse Public Key"},
		{c.LangfuseSecretKey, "Langfuse Secret Key"},
	}

	for _, s := range secrets {
		trimmed := strings.TrimSpace(s.value)
		if trimmed == "" {
			continue
		}

		result = append(result, patterns.Pattern{
			Name:  s.name,
			Regex: "(?P<replace>" + regexp.QuoteMeta(trimmed) + ")",
		})
	}

	return result
}
