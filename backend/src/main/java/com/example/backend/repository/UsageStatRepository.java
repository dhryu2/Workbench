package com.example.backend.repository;

import com.example.backend.domain.UsageStat;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 쓰기 전용 — 카운트를 읽어오는 메서드는 두지 않는다(조회는 H2 Shell로만).
public interface UsageStatRepository extends JpaRepository<UsageStat, Long> {

    // 조회 없이 원자적으로 +1 — 동시 요청 경쟁 상태를 최소화.
    // CURRENT_TIMESTAMP는 Hibernate에서 java.sql.Timestamp로 해석되어 Instant 필드에 대입 불가(SemanticException) →
    // 애플리케이션에서 만든 Instant를 바인드 파라미터로 전달한다.
    @Modifying
    @Query("UPDATE UsageStat u SET u.count = u.count + 1, u.updatedAt = :now WHERE u.scopeKey = :scopeKey")
    int incrementByScopeKey(@Param("scopeKey") String scopeKey, @Param("now") Instant now);
}
