package com.pocketphrases.generate;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * One shared Anthropic client for every AI feature (lesson generation,
 * roleplay). The API key is read from an environment variable
 * (spring.config "anthropic.api-key" -> ANTHROPIC_API_KEY) and never appears
 * in frontend code or the repo.
 */
@Configuration
public class AnthropicConfig {

    /** Cheap, fast model shared by all AI features. */
    public static final String MODEL = "claude-haiku-5-5";

    @Bean
    public AnthropicClient anthropicClient(@Value("${anthropic.api-key:}") String apiKey) {
        return AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }
}
