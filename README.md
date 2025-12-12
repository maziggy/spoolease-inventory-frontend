# SpoolEase Inventory Frontend

Web-based inventory management interface for [SpoolEase](https://github.com/maziggy/SpoolEase) - a smart add-on system for Bambu Lab 3D printers.

## Features

- View and manage your filament spool inventory
- Add, edit, and delete spools
- Track filament weight and consumption
- Manage pressure advance (K-factor) settings per printer/nozzle
- Filter and search spools by material, brand, color
- Configurable table columns
- Dark/light theme support
- Secure encrypted communication with SpoolEase device

## Prerequisites

- Node.js 18+
- A SpoolEase device on your network

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure the device IP address in `vite.config.ts`:
   ```typescript
   proxy: {
     '/api': {
       target: 'http://YOUR_DEVICE_IP',
       changeOrigin: true,
     },
     // ... other proxy entries
   }
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 and enter your SpoolEase security key

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for ESP32 deployment |
| `npm run build:standalone` | Build standalone version to `dist/` |
| `npm run start` | Serve standalone build |
| `npm run preview` | Preview ESP32 build |
| `npm run lint` | Run ESLint |

## Production

### Standalone Mode

Build and run as a standalone web app:

```bash
npm run build:standalone
npm run start
```

This serves the app at http://localhost:4173. Note: You still need a SpoolEase device on your network for the API proxy to work.

### ESP32 Deployment

The default `npm run build` outputs to `../../bins/0.5/inventory-new` for embedding into SpoolEase device firmware.

## Tech Stack

- [Preact](https://preactjs.com/) - Lightweight React alternative
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [TanStack Table](https://tanstack.com/table) - Data table
- [Lucide](https://lucide.dev/) - Icons

## Project Structure

```
src/
├── components/     # UI components (SpoolsTable, Header, modals, etc.)
├── context/        # AppContext for global state management
├── hooks/          # Custom hooks (useTheme)
├── lib/            # Utilities
│   ├── api.ts      # API client with encryption
│   ├── crypto.ts   # WASM-based encryption
│   └── utils.ts    # Helper functions
├── App.tsx         # Main app component
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## Documentation

For more information about SpoolEase, visit the [official documentation](https://docs.spoolease.io/docs/welcome).
