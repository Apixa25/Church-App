package com.churchapp;

import com.churchapp.exception.DonationExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The global handler must map framework-level client errors to their proper
 * status codes instead of letting the catch-all report them as 500s.
 */
class DonationExceptionHandlerTest {

    private final DonationExceptionHandler handler = new DonationExceptionHandler();

    @Test
    void unknownRouteIs404() {
        ResponseEntity<DonationExceptionHandler.ErrorResponse> r =
            handler.handleNotFound(new NoResourceFoundException(HttpMethod.GET, "public/posts"));

        assertEquals(HttpStatus.NOT_FOUND, r.getStatusCode());
        assertEquals("NOT_FOUND", r.getBody().getErrorCode());
    }

    @Test
    void wrongVerbIs405WithAllowHeader() {
        ResponseEntity<DonationExceptionHandler.ErrorResponse> r =
            handler.handleMethodNotAllowed(new HttpRequestMethodNotSupportedException("GET", List.of("POST")));

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, r.getStatusCode());
        assertEquals("METHOD_NOT_ALLOWED", r.getBody().getErrorCode());
        assertTrue(r.getHeaders().getAllow().contains(HttpMethod.POST));
    }

    @Test
    void accessDeniedIs403() {
        ResponseEntity<DonationExceptionHandler.ErrorResponse> r =
            handler.handleAccessDenied(new AccessDeniedException("Admin only"));

        assertEquals(HttpStatus.FORBIDDEN, r.getStatusCode());
        assertEquals("FORBIDDEN", r.getBody().getErrorCode());
    }

    @Test
    void everythingElseIsStill500() {
        ResponseEntity<DonationExceptionHandler.ErrorResponse> r =
            handler.handleGenericException(new IllegalStateException("boom"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, r.getStatusCode());
        assertEquals("INTERNAL_ERROR", r.getBody().getErrorCode());
    }
}
