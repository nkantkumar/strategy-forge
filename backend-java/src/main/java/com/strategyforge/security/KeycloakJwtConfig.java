package com.strategyforge.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;

/**
 * Registers JwtDecoder when Keycloak issuer URI is configured.
 * Enables validation of Bearer tokens issued by Keycloak.
 */
@Configuration
@Conditional(KeycloakIssuerUriPresent.class)
public class KeycloakJwtConfig {

    @Bean
    public JwtDecoder jwtDecoder(@Value("${auth.keycloak.issuer-uri}") String issuerUri) {
        return JwtDecoders.fromIssuerLocation(issuerUri);
    }
}
