# Workbench

A full-stack web application. English is the base language, with internationalization
(i18n) support so the UI can be localized into other languages.

## Tech stack

- **Frontend** — React + TypeScript, bundled with [Vite](https://vitejs.dev/)
- **Backend** — Spring Boot 4.1.0 (Gradle, Groovy DSL) on Java 17

## Project structure

```
Workbench/
├── frontend/   # React + TypeScript (Vite)
└── backend/    # Spring Boot (Gradle, Java 17)
```

## Prerequisites

- **Node.js** 20+ and npm
- **JDK 17** (Temurin recommended). This repo pins the JDK for the backend via asdf
  (`backend/.tool-versions`). If you don't use asdf, install JDK 17 and make sure
  `java -version` reports 17, or set `JAVA_HOME` accordingly.

## Getting started

### Frontend

```bash
cd frontend
npm install       # first time only
npm run dev       # http://localhost:5173
```

### Backend

```bash
cd backend
./gradlew bootRun # http://localhost:23001
```

To build a production artifact:

```bash
cd backend && ./gradlew build   # jar in backend/build/libs/
cd frontend && npm run build     # static assets in frontend/dist/
```

## Development notes

- Documentation is written in English; inline code comments are written in Korean.
- User-facing strings are authored in English and localized through i18n — avoid
  hardcoding display text.

## License

[MIT](LICENSE)
