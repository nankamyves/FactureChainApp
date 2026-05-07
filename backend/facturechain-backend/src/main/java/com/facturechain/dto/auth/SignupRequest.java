package com.facturechain.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignupRequest {
    private String username;
    private String email;
    private String password;
    private String confirmPassword;
    private String fullName;
    private String subscriberCode;
    private String city;
    private String district;
}
