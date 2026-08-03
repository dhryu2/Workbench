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
RUN ./gradlew --no-daemon copyH2Jar

# ============================================================
#  runtime stage — JRE만으로 jar 실행
# ============================================================
FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app

# root가 아닌 사용자로 실행
RUN addgroup --system app && adduser --system --ingroup app app

# H2 파일 DB가 쓰일 데이터 디렉토리를 app 유저 전환 전에 미리 만들고 소유권을 넘김
RUN mkdir -p /app/data && chown app:app /app/data
USER app

# bootJar 산출물만 복사 (plain jar 제외)
COPY --from=build --chown=app:app /app/build/libs/*-SNAPSHOT.jar app.jar
# H2 Shell CLI로 컨테이너 안에서 DB 파일을 직접 조회하기 위한 별도 jar
COPY --from=build --chown=app:app /app/build/h2-jar/*.jar h2.jar
EXPOSE 23001
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]
