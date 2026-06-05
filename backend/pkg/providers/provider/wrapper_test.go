package provider

import (
	"context"
	"testing"

	"pentagi/pkg/providers/pconfig"
	"pentagi/pkg/templates"

	"github.com/vxcontrol/langchaingo/llms"
	"github.com/vxcontrol/langchaingo/llms/streaming"
)

type prefixedModelProvider struct {
	model           string
	modelWithPrefix string
}

func (p prefixedModelProvider) Type() ProviderType {
	return ProviderDeepSeek
}

func (p prefixedModelProvider) Name() ProviderName {
	return DefaultProviderNameDeepSeek
}

func (p prefixedModelProvider) Model(pconfig.ProviderOptionsType) string {
	return p.model
}

func (p prefixedModelProvider) ModelWithPrefix(pconfig.ProviderOptionsType) string {
	return p.modelWithPrefix
}

func (p prefixedModelProvider) GetUsage(map[string]any) pconfig.CallUsage {
	return pconfig.CallUsage{}
}

func (p prefixedModelProvider) Call(
	context.Context,
	pconfig.ProviderOptionsType,
	string,
) (string, error) {
	return "", nil
}

func (p prefixedModelProvider) CallEx(
	context.Context,
	pconfig.ProviderOptionsType,
	[]llms.MessageContent,
	streaming.Callback,
) (*llms.ContentResponse, error) {
	return nil, nil
}

func (p prefixedModelProvider) CallWithTools(
	context.Context,
	pconfig.ProviderOptionsType,
	[]llms.MessageContent,
	[]llms.Tool,
	streaming.Callback,
) (*llms.ContentResponse, error) {
	return nil, nil
}

func (p prefixedModelProvider) GetRawConfig() []byte {
	return nil
}

func (p prefixedModelProvider) GetProviderConfig() *pconfig.ProviderConfig {
	return nil
}

func (p prefixedModelProvider) GetPriceInfo(pconfig.ProviderOptionsType) *pconfig.PriceInfo {
	return nil
}

func (p prefixedModelProvider) GetModels() pconfig.ModelsConfig {
	return nil
}

func (p prefixedModelProvider) GetToolCallIDTemplate(
	context.Context,
	templates.Prompter,
) (string, error) {
	return "", nil
}

func TestWrapGenerateContentUsesPrefixedModelInCallOptions(t *testing.T) {
	provider := prefixedModelProvider{
		model:           "deepseek-v4-flash",
		modelWithPrefix: "deepseek/deepseek-v4-flash",
	}
	var capturedModel string

	generate := func(
		_ context.Context,
		_ []llms.MessageContent,
		options ...llms.CallOption,
	) (*llms.ContentResponse, error) {
		callOptions := llms.CallOptions{}
		for _, option := range options {
			option(&callOptions)
		}
		capturedModel = callOptions.GetModel()

		return &llms.ContentResponse{
			Choices: []*llms.ContentChoice{
				{Content: "ok", GenerationInfo: map[string]any{}},
			},
		}, nil
	}

	_, err := WrapGenerateContent(
		context.Background(),
		provider,
		pconfig.OptionsTypeSimple,
		generate,
		[]llms.MessageContent{llms.TextParts(llms.ChatMessageTypeHuman, "ping")},
		llms.WithModel(provider.Model(pconfig.OptionsTypeSimple)),
	)
	if err != nil {
		t.Fatalf("WrapGenerateContent returned error: %v", err)
	}

	if capturedModel != provider.ModelWithPrefix(pconfig.OptionsTypeSimple) {
		t.Fatalf("expected generated call model %q, got %q",
			provider.ModelWithPrefix(pconfig.OptionsTypeSimple),
			capturedModel,
		)
	}
}
