package com.churchapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

@SpringBootApplication
@ComponentScan(basePackages = "com.churchapp")
@EnableJpaRepositories(basePackages = "com.churchapp.repository")
public class ChurchAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(ChurchAppApplication.class, args);
    }
}