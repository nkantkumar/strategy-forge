package com.strategyforge.client;

import org.springframework.http.HttpStatus;

public class PythonApiException extends RuntimeException {

    private final int statusCode;
    private final String responseBody;

    public PythonApiException(int statusCode, String responseBody) {
        super("Python API returned " + statusCode + ": " + responseBody);
        this.statusCode = statusCode;
        this.responseBody = responseBody != null ? responseBody : "";
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }
}
