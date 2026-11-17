# Origin Coffee

Origin Coffee is a Colombian coffee business proposal by Juan Daniel Saldarriaga and Jesus David Martinez Perez. This repository contains an initial web prototype to present the company, its illustrative coffee catalog, the coffee origin and process, and a contact form.

## Project structure

- `frontend/`: responsive website served by the backend.
- `backend/`: Node.js API and static file server.
- `docs/requirements.md`: course scope and prototype limitations.

## Run locally

Requires Node.js 20 or newer. No third-party packages are needed.

```powershell
npm start
```

Open <http://localhost:3000>. Run the backend tests with `npm test`.

The catalog is illustrative. Contact submissions are held in memory only while the server is running; they are not emailed or saved permanently. Do not use this prototype to collect real customer information.

## Git workflow

The intended integration path is `main` <- `stage` <- `dev`. Individual work branches are created from `dev`, merged back into `dev`, and then promoted through `stage` to `main`.

Team members should use their own GitHub accounts for their contributions and commits. This repository does not contain credentials.
