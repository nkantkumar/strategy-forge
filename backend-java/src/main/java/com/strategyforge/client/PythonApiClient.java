package com.strategyforge.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class PythonApiClient {

    private static final Logger log = LoggerFactory.getLogger(PythonApiClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PythonApiClient(@Qualifier("pythonApiRestTemplate") RestTemplate restTemplate,
                           @Qualifier("pythonApiBaseUrl") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    public JsonNode post(String path, Object body) {
        String url = baseUrl + path;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getBody() == null) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(response.getBody());
        } catch (HttpStatusCodeException e) {
            // Forward 4xx/5xx from Python so frontend can show "No market data" etc.
            String responseBody = e.getResponseBodyAsString();
            log.warn("Python API returned {}: {} - {}", e.getStatusCode(), path, responseBody);
            throw new PythonApiException(e.getStatusCode().value(), responseBody);
        } catch (Exception e) {
            log.warn("Python API call failed: {} - {}", path, e.getMessage());
            throw new RuntimeException("Strategy service unavailable: " + e.getMessage());
        }
    }

    public JsonNode get(String path) {
        String url = baseUrl + path;
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getBody() == null) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            log.warn("Python API call failed: {} - {}", path, e.getMessage());
            throw new RuntimeException("Strategy service unavailable: " + e.getMessage());
        }
    }

    public JsonNode generateStrategy(String symbol, String startDate, String endDate, String riskTolerance) {
        Map<String, Object> body = Map.of(
                "symbol", symbol,
                "start_date", startDate,
                "end_date", endDate,
                "risk_tolerance", riskTolerance != null ? riskTolerance : "medium"
        );
        return post("/api/v1/strategies/generate", body);
    }

    public JsonNode runBacktest(Map<String, Object> strategy, String symbol, String startDate, String endDate, Double initialCapital) {
        Map<String, Object> body = Map.of(
                "strategy", strategy != null ? strategy : Map.of(),
                "symbol", symbol,
                "start_date", startDate,
                "end_date", endDate,
                "initial_capital", initialCapital != null ? initialCapital : 100_000.0
        );
        return post("/api/v1/backtest/run", body);
    }

    public JsonNode getTopStrategies(int limit) {
        return get("/api/v1/strategies/top?limit=" + limit);
    }

    public JsonNode health() {
        return get("/api/v1/health");
    }
}
