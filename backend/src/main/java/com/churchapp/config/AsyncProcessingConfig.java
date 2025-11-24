package com.churchapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configuration for async media processing
 * Handles background processing of images and videos
 */
@Configuration
@EnableAsync
@Slf4j
public class AsyncProcessingConfig {

    @Value("${media.processing.async.core-pool-size:2}")
    private int corePoolSize;

    @Value("${media.processing.async.max-pool-size:4}")
    private int maxPoolSize;

    @Value("${media.processing.async.queue-capacity:100}")
    private int queueCapacity;

    @Bean(name = "mediaProcessingExecutor")
    public Executor mediaProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("media-processing-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        
        log.info("Media processing executor configured: corePoolSize={}, maxPoolSize={}, queueCapacity={}",
                corePoolSize, maxPoolSize, queueCapacity);
        
        return executor;
    }
}

