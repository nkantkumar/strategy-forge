package com.strategyforge.security;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * Condition: true when auth.keycloak.issuer-uri is set and non-empty.
 */
public class KeycloakIssuerUriPresent implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String uri = context.getEnvironment().getProperty("auth.keycloak.issuer-uri", "");
        return StringUtils.hasText(uri);
    }
}
