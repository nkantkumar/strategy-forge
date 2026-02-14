package com.strategyforge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class PythonApiConfig {

    @Value("${strategy-forge.python-api.base-url:http://localhost:8000}")
    private String baseUrl;

    @Value("${strategy-forge.python-api.connect-timeout:5000}")
    private int connectTimeout;

    @Value("${strategy-forge.python-api.read-timeout:60000}")
    private int readTimeout;

    @Bean
    public RestTemplate pythonApiRestTemplate() {
        ClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        ((SimpleClientHttpRequestFactory) factory).setConnectTimeout(connectTimeout);
        ((SimpleClientHttpRequestFactory) factory).setReadTimeout(readTimeout);
        return new RestTemplate(factory);
    }

    @Bean
    public String pythonApiBaseUrl() {
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }
}
