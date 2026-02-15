package com.strategyforge.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * Validates X-API-Key header against configured secret.
 * When AUTH_API_KEY is set, requests to /api/v1/** must include header "X-API-Key: <value>".
 * When AUTH_API_KEY is not set, all requests are allowed (no auth).
 */
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-API-Key";
    private static final List<SimpleGrantedAuthority> USER_AUTHORITY =
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));

    private final String configuredApiKey;

    public ApiKeyAuthenticationFilter(String configuredApiKey) {
        this.configuredApiKey = configuredApiKey == null ? "" : configuredApiKey.trim();
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        // Auth disabled: no key configured
        if (configuredApiKey.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Actuator and other non-API paths can be permitted by SecurityConfig; we still set auth if key present
        String path = request.getRequestURI();
        if (path != null && (path.startsWith("/actuator") || path.startsWith("/error"))) {
            filterChain.doFilter(request, response);
            return;
        }

        String providedKey = request.getHeader(API_KEY_HEADER);
        if (providedKey == null) {
            providedKey = "";
        }

        if (!configuredApiKey.equals(providedKey)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\":\"Unauthorized\",\"detail\":\"Missing or invalid X-API-Key\"}");
            return;
        }

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken("api-key", null, USER_AUTHORITY);
        SecurityContextHolder.getContext().setAuthentication(auth);
        filterChain.doFilter(request, response);
    }
}
