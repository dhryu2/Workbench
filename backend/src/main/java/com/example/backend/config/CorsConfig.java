package com.example.backend.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// /stats API의 CORS 허용.
// 운영에서는 nginx가 /api를 same-origin으로 프록시하므로 사실상 불필요하고, dev에서 프론트가
// 백엔드를 직접(VITE_API_BASE_URL=http://localhost:23001) 호출할 때만 쓰인다.
// 주의: CORS는 브라우저 규약일 뿐 접근 제어가 아니다 — curl은 그대로 통과한다.
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins:}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 빈 값이 들어오면 split 결과가 [""]가 되어 CORS 등록이 깨지므로, 공백 항목을 걸러내고
        // 남는 오리진이 없으면 아예 등록하지 않는다.
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
        if (origins.length == 0) {
            return;
        }
        registry.addMapping("/stats/**")
                .allowedOrigins(origins)
                .allowedMethods("POST");
    }
}
