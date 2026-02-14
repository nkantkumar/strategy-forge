package com.strategyforge.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.strategyforge.client.PythonApiClient;
import com.strategyforge.client.PythonApiException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*", maxAge = 3600)
public class GatewayController {

    private final PythonApiClient pythonApi;

    public GatewayController(PythonApiClient pythonApi) {
        this.pythonApi = pythonApi;
    }

    @PostMapping("/strategies/generate")
    @CircuitBreaker(name = "pythonApi", fallbackMethod = "generateStrategyFallback")
    @Retry(name = "pythonApi")
    public ResponseEntity<JsonNode> generateStrategy(@RequestBody Map<String, Object> request) {
        String symbol = (String) request.getOrDefault("symbol", "AAPL");
        String startDate = (String) request.get("start_date");
        String endDate = (String) request.get("end_date");
        String riskTolerance = (String) request.getOrDefault("risk_tolerance", "medium");
        if (startDate == null || endDate == null) {
            return ResponseEntity.badRequest().build();
        }
        JsonNode result = pythonApi.generateStrategy(symbol, startDate, endDate, riskTolerance);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/backtest/run")
    @CircuitBreaker(name = "pythonApi", fallbackMethod = "backtestFallback")
    @Retry(name = "pythonApi")
    public ResponseEntity<JsonNode> runBacktest(@RequestBody Map<String, Object> request) {
        @SuppressWarnings("unchecked")
        Map<String, Object> strategy = (Map<String, Object>) request.get("strategy");
        String symbol = (String) request.get("symbol");
        String startDate = (String) request.get("start_date");
        String endDate = (String) request.get("end_date");
        Number cap = (Number) request.get("initial_capital");
        Double initialCapital = cap != null ? cap.doubleValue() : 100_000.0;
        if (strategy == null || symbol == null || startDate == null || endDate == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            JsonNode result = pythonApi.runBacktest(strategy, symbol, startDate, endDate, initialCapital);
            return ResponseEntity.ok(result);
        } catch (PythonApiException e) {
            try {
                JsonNode body = new ObjectMapper().readTree(e.getResponseBody());
                return ResponseEntity.status(e.getStatusCode()).body(body);
            } catch (Exception ignored) {
                return ResponseEntity.status(e.getStatusCode())
                    .body(com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode()
                        .put("detail", e.getResponseBody()));
            }
        }
    }

    @GetMapping("/strategies/top")
    @CircuitBreaker(name = "pythonApi", fallbackMethod = "topStrategiesFallback")
    public ResponseEntity<JsonNode> getTopStrategies(@RequestParam(defaultValue = "10") int limit) {
        JsonNode result = pythonApi.getTopStrategies(limit);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/health")
    public ResponseEntity<JsonNode> health() {
        JsonNode result = pythonApi.health();
        return ResponseEntity.ok(result);
    }

    public ResponseEntity<JsonNode> generateStrategyFallback(Map<String, Object> request, Throwable t) {
        return ResponseEntity.status(503).body(
                com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode()
                        .put("error", "Strategy generation temporarily unavailable")
                        .put("detail", t != null ? t.getMessage() : "unknown"));
    }

    public ResponseEntity<JsonNode> backtestFallback(Map<String, Object> request, Throwable t) {
        return ResponseEntity.status(503).body(
                com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode()
                        .put("error", "Backtest service temporarily unavailable")
                        .put("detail", t != null ? t.getMessage() : "unknown"));
    }

    public ResponseEntity<JsonNode> topStrategiesFallback(Integer limit, Throwable t) {
        return ResponseEntity.ok(
                com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode()
                        .putArray("top_strategies"));
    }
}
