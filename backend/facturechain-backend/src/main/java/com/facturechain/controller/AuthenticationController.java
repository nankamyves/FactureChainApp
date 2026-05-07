package com.facturechain.controller;

import com.facturechain.dto.auth.AuthResponse;
import com.facturechain.dto.auth.LoginRequest;
import com.facturechain.dto.auth.SignupRequest;
import com.facturechain.model.User;
import com.facturechain.repository.UserRepository;
import com.facturechain.service.AuthenticationService;
import com.facturechain.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthenticationController {

    private final AuthenticationService authenticationService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    public AuthenticationController(
            AuthenticationService authenticationService,
            AuditLogService auditLogService,
            UserRepository userRepository
    ) {
        this.authenticationService = authenticationService;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(
            @RequestBody SignupRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            AuthResponse response = authenticationService.signup(request);
            
            // Log the signup action
            userRepository.findByEmail(request.getEmail()).ifPresent(user ->
                auditLogService.logAction(user, "SIGNUP", httpRequest)
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            AuthResponse response = authenticationService.login(request);
            
            // Log the login action
            userRepository.findByEmail(request.getEmail()).ifPresent(user ->
                auditLogService.logAction(user, "LOGIN", httpRequest)
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(HttpServletRequest request) {
        try {
            final String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }

            final String refreshToken = authHeader.substring(7);
            AuthResponse response = authenticationService.refreshToken(refreshToken);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @GetMapping("/me")
    public ResponseEntity<String> getCurrentUser() {
        return ResponseEntity.ok("Authenticated user endpoint");
    }
}
