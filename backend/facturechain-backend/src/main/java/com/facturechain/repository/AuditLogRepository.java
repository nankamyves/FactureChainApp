package com.facturechain.repository;

import com.facturechain.model.AuditLog;
import com.facturechain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUser(User user);
    List<AuditLog> findByUserAndTimestampBetween(User user, LocalDateTime start, LocalDateTime end);
    List<AuditLog> findByAction(String action);
}
