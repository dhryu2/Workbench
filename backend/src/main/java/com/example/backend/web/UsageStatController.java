package com.example.backend.web;

import com.example.backend.service.UsageStatService;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 집계 "쓰기" 전용 컨트롤러. 읽기 엔드포인트는 의도적으로 존재하지 않는다 —
// 수치는 서버에 SSH로 붙어 H2 Shell로만 조회한다(scripts/stats.sh).
// 응답 본문에 카운트를 담으면 방문자가 DevTools로 볼 수 있으므로 항상 204(본문 없음)로 답한다.
@RestController
@RequestMapping("/stats")
@RequiredArgsConstructor
public class UsageStatController {

    // toolId는 scopeKey이자 URL 세그먼트로 쓰이므로 영숫자/하이픈만, 길이도 제한해 임의 키 생성을 막는다
    private static final Pattern TOOL_ID_PATTERN = Pattern.compile("^[a-z0-9-]{1,64}$");

    private final UsageStatService service;

    @PostMapping("/visit")
    public ResponseEntity<Void> visit() {
        service.increment("site");
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/tools/{toolId}/usage")
    public ResponseEntity<Void> toolUsage(@PathVariable String toolId) {
        if (!TOOL_ID_PATTERN.matcher(toolId).matches()) {
            return ResponseEntity.badRequest().build();
        }
        service.increment("tool:" + toolId);
        return ResponseEntity.noContent().build();
    }
}
