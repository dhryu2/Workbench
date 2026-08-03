package com.example.backend.service;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UsageStatService {

    private final UsageStatTx tx;

    // 원자적 UPDATE 우선 시도 → 행이 없으면(최초 호출) INSERT.
    // 최초 요청이 동시에 여러 개 들어와 INSERT가 유니크 제약에 걸리면 그 트랜잭션은 롤백되고,
    // 여기(트랜잭션 밖)서 예외를 받아 새 트랜잭션으로 UPDATE를 재시도한다.
    //
    // 집계 수치는 절대 반환하지 않는다 — 응답 본문으로 나가면 웹 사용자가 DevTools로 볼 수 있다.
    public void increment(String scopeKey) {
        Instant now = Instant.now();
        if (tx.incrementExisting(scopeKey, now)) {
            return;
        }
        try {
            tx.insertFirst(scopeKey, now);
        } catch (DataIntegrityViolationException e) {
            tx.incrementExisting(scopeKey, now);
        }
    }
}
