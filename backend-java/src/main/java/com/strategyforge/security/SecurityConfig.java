package com.strategyforge.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.util.StringUtils;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${auth.api-key:}")
    private String apiKey;

    @Autowired(required = false)
    private JwtDecoder jwtDecoder;

    @Bean
    public ApiKeyAuthenticationFilter apiKeyAuthenticationFilter() {
        return new ApiKeyAuthenticationFilter(apiKey);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        boolean apiKeyAuthEnabled = StringUtils.hasText(apiKey);
        boolean keycloakEnabled = jwtDecoder != null;

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/actuator/**", "/error").permitAll();
                    if (apiKeyAuthEnabled || keycloakEnabled) {
                        auth.requestMatchers("/api/v1/**").authenticated();
                        auth.anyRequest().authenticated();
                    } else {
                        auth.anyRequest().permitAll();
                    }
                })
                .addFilterBefore(apiKeyAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        if (keycloakEnabled) {
            http.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(jwtDecoder)));
        }

        return http.build();
    }
}
