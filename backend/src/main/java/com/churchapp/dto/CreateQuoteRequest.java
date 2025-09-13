package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Size;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuoteRequest {

    @Size(max = 2000, message = "Quote text cannot exceed 2000 characters")
    private String content;

    private List<String> mediaUrls;

    private List<String> mediaTypes;
}
