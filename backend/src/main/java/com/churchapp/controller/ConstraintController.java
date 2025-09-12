package com.churchapp.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
@Slf4j
public class ConstraintController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/constraints")
    public Map<String, Object> getConstraints() {
        try {
            log.info("🔍 Checking database constraints...");
            
            // Query to get all constraints on the events table
            String sql = "SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, CHECK_CLAUSE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc " +
                        "LEFT JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME " +
                        "WHERE tc.TABLE_NAME = 'EVENTS'";
            
            List<Map<String, Object>> constraints = jdbcTemplate.queryForList(sql);
            
            log.info("📋 Found {} constraints on EVENTS table:", constraints.size());
            for (Map<String, Object> constraint : constraints) {
                String name = (String) constraint.get("CONSTRAINT_NAME");
                String type = (String) constraint.get("CONSTRAINT_TYPE");
                String checkClause = (String) constraint.get("CHECK_CLAUSE");
                
                log.info("  - {}: {} {}", name, type, checkClause != null ? "(" + checkClause + ")" : "");
            }
            
            // Also check for any constraints with "CONSTRAINT_7" in the name
            String constraint7Sql = "SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, CHECK_CLAUSE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc " +
                                   "LEFT JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME " +
                                   "WHERE tc.CONSTRAINT_NAME LIKE '%CONSTRAINT_7%'";
            
            List<Map<String, Object>> constraint7 = jdbcTemplate.queryForList(constraint7Sql);
            
            if (!constraint7.isEmpty()) {
                log.info("🎯 Found CONSTRAINT_7 details:");
                for (Map<String, Object> constraint : constraint7) {
                    String name = (String) constraint.get("CONSTRAINT_NAME");
                    String type = (String) constraint.get("CONSTRAINT_TYPE");
                    String checkClause = (String) constraint.get("CHECK_CLAUSE");
                    
                    log.info("  - {}: {} {}", name, type, checkClause != null ? "(" + checkClause + ")" : "");
                }
            } else {
                log.info("❌ No CONSTRAINT_7 found in database");
            }
            
            return Map.of(
                "constraints", constraints,
                "constraint7", constraint7,
                "message", "Check logs for detailed constraint information"
            );
            
        } catch (Exception e) {
            log.error("❌ Error checking constraints: {}", e.getMessage(), e);
            return Map.of("error", e.getMessage());
        }
    }
}
