package com.example.backend.service;

import com.example.backend.domain.UsageStat;
import com.example.backend.repository.UsageStatRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// UsageStatService의 트랜잭션 경계 분리용 헬퍼.
//
// 왜 별도 빈인가: 제약 위반(DataIntegrityViolationException)은 트랜잭션을 rollback-only로 마킹한다.
// 같은 트랜잭션 안에서 잡아 재시도하면 커밋 시점에 UnexpectedRollbackException으로 터진다.
// 따라서 INSERT는 자기 트랜잭션 안에서 깨끗이 롤백시키고, 예외는 트랜잭션 밖(호출자)에서 잡아야 한다.
@Component
@RequiredArgsConstructor
public class UsageStatTx {

    private final UsageStatRepository repository;

    // 이미 행이 있으면 원자적으로 +1. 행이 없으면 false.
    @Transactional
    public boolean incrementExisting(String scopeKey, Instant now) {
        return repository.incrementByScopeKey(scopeKey, now) > 0;
    }

    // 최초 1건 INSERT. 동시 요청이 경합하면 유니크 제약 위반 예외가 이 트랜잭션 밖으로 전파된다.
    @Transactional
    public void insertFirst(String scopeKey, Instant now) {
        UsageStat stat = new UsageStat(scopeKey);
        stat.setCount(1);
        stat.setUpdatedAt(now);
        repository.saveAndFlush(stat);
    }
}
