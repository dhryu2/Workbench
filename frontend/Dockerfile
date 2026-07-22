# syntax=docker/dockerfile:1

# ============================================================
#  build stage — Vite 정적 빌드 산출물(dist) 생성
# ============================================================
FROM node:22-alpine AS build
WORKDIR /app

# 의존성 레이어 캐시: package 파일 먼저 복사
COPY package.json package-lock.json ./
# vite 등 devDependencies가 빌드에 필요 → omit=dev 방지 위해 명시적으로 포함.
# npm ci 대신 npm install 사용: lock이 arm64 Mac에서 생성돼 linux-amd64용 optional deps
# (@emnapi/* 등 rollup 네이티브 체인)가 빠질 수 있어, 컨테이너(linux/amd64)에서 재해석.
ENV NODE_ENV=development
RUN npm install --include=dev --no-audit --no-fund

# 소스 복사 후 빌드
COPY . .
# 빌드 타임에 번들로 구워지는 백엔드 API 주소 (compose build args로 주입)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ============================================================
#  runtime stage — nginx로 정적 서빙 + /api 프록시
# ============================================================
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
