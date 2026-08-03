package com.example.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

// 사이트 방문/도구 사용 카운터 — scopeKey 하나당 누적 카운트 하나("site" 또는 "tool:{id}")
@Entity
@Table(name = "usage_stat")
@Getter
@Setter
public class UsageStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String scopeKey;

    private long count = 0;

    private Instant updatedAt;

    public UsageStat() {
    }

    public UsageStat(String scopeKey) {
        this.scopeKey = scopeKey;
    }
}
