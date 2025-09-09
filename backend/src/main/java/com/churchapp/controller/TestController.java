package com.churchapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.Map;

@Controller
@RequestMapping("/test")
public class TestController {
    
    @GetMapping("/hello")
    @ResponseBody
    public ResponseEntity<?> hello() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello World!");
        response.put("status", "Controller is working!");
        return ResponseEntity.ok(response);
    }
}
