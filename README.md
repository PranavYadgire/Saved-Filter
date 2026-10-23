# Saved Filter Views — Trello Power-Up UI MVP

A standalone React + Vite project based on the supplied `trello-insights-powerup-starter` structure. The local demo includes the Trello-style board, Saved Filters popover, create/edit/rename/delete dialogs, working condition filtering, card search, clear filters, and browser persistence.

## Requirements
- Node.js 20.19+ or 22.12+ (Node 22 is recommended)
- npm

## Run locally
1. Extract the ZIP.
2. Open this folder in VS Code.
3. In the terminal, run:

   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL printed by Vite (normally `http://localhost:5173`).

The project includes `.env.example`. Copy it to `.env` if you want to configure local environment variables. Demo mode works without credentials. **Do not add Trello tokens or private secrets to a Vite `VITE_*` variable**, because those values are exposed to the browser.

## Working in this local demo
- Create filters using member, due date, labels, card type, checklist, attachment, keyword and custom-field settings.
- Save a view with a unique name; it is automatically applied.
- Apply saved views from the Saved Filters dropdown.
- Use the row `•••` menu to edit, rename or delete a saved view.
- Clear filters to return to all demo cards.
- Search card titles/descriptions/labels.
- Saved view definitions persist in `localStorage` for this browser.
- Add a demo card from a board column's `Add a card` control.

The data and the due-date evaluation are intentionally demo/mock data (with a fixed demo date of 22 October 2026) so the UI can be developed before Trello is connected. This is a functional frontend prototype, not yet a production-connected Trello Power-Up.

## Build

```bash
npm run build
npm run preview
```

The Vite output is generated in `dist/`.

## Trello integration is a separate next step
- `public/connector.html` and `public/connector.js` provide a basic board-button entry point using Trello's Power-Up client library.
- Host the built app over HTTPS.
- In Trello Power-Up admin, configure the connector URL to `https://YOUR-DOMAIN/connector.html` (the connector references the app at the site root).
- Enable the `board-buttons` capability.
- The connector is only a starting integration. This demo's filter data and card list are local mock data; before production use, replace them with Trello board/card/member/label data and store saved views with appropriate Trello Power-Up storage. Trello does not provide a normal Power-Up API for injecting arbitrary controls into its native filter bar, so this project reproduces the design in its own UI.

## Folder structure

```text
saved-filter-views/
├── public/
│   ├── connector.html
│   └── connector.js
├── src/
│   ├── main.jsx
│   └── styles.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.js
```
