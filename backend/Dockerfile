# syntax=docker/dockerfile:1

# ============================================================
#  build stage — Gradle로 실행 가능한 bootJar 생성
# ============================================================
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Gradle 래퍼 + 빌드 스크립트 먼저 복사 (의존성 레이어 캐시)
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies || true

# 소스 복사 후 테스트 제외하고 빌드
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ============================================================
#  runtime stage — JRE만으로 jar 실행
# ============================================================
FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app

# root가 아닌 사용자로 실행
RUN addgroup --system app && adduser --system --ingroup app app
USER app

# bootJar 산출물만 복사 (plain jar 제외)
COPY --from=build /app/build/libs/*-SNAPSHOT.jar app.jar
EXPOSE 23001
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]
