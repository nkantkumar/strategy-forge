package com.strategyforge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class StrategyForgeGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(StrategyForgeGatewayApplication.class, args);
    }
}
