# Workbench

Full-stack web application. **English-first with i18n support** — the product UI is
built in English as the base language and designed to be translated into other
languages later.

## Language conventions

- **Docs in English**: `CLAUDE.md`, `README.md`, and all documentation are written in English.
- **Code comments in Korean**: inline comments inside source files are written in Korean
  (한글) for the maintainer's readability.
- **User-facing strings**: authored in English and routed through i18n so they can be
  localized; never hardcode display text that the user will see.

## Tech stack

| Layer    | Stack                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React + TypeScript, built with Vite                         |
| Backend  | Spring Boot 4.1.0 (Gradle, Groovy DSL), Java 17             |

## Project layout

```
Workbench/
├── frontend/   # React + TypeScript (Vite)
└── backend/    # Spring Boot (Gradle, Java 17)
```

`backend/.tool-versions` pins the JDK via asdf (Temurin 17).

## Run

```bash
# Frontend (dev server on :5173)
cd frontend && npm run dev

# Backend (app on :8080)
cd backend && ./gradlew bootRun
```

If `java` is not on the shell PATH, either ensure asdf shims are loaded or set
`JAVA_HOME` to a JDK 17 install before running Gradle.

## Conventions

- Keep frontend and backend concerns separated; the two apps communicate over HTTP.
- Prefer the latest **GA** framework releases and the highest **LTS** Java version the
  ecosystem supports (currently Java 17; bump deliberately, not automatically).
