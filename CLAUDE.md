# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpoolEase Inventory is a web frontend for managing 3D printer filament spools. It connects to a SpoolEase ESP32 device to manage spool inventory with features like NFC tag identification, weight tracking, and pressure advance (K-factor) settings.

## Commands

- **Dev server**: `npm run dev` (runs on port 5173)
- **Build for ESP32**: `npm run build` (outputs to `../../bins/0.5/inventory-new`)
- **Build standalone**: `npm run build:standalone` (outputs to `dist/`)
- **Start standalone**: `npm run start` (serves standalone build on port 4173)
- **Type check**: `npx tsc --noEmit`
- **Lint**: `npm run lint`

## Tech Stack

- **Preact** (not React) with TypeScript
- **Vite** for bundling
- **Tailwind CSS v4** (beta) via `@tailwindcss/vite`
- **@tanstack/react-table** for data tables
- **lucide-preact** for icons

## Architecture

### API Communication Pattern

All API communication with the ESP32 device uses **encrypted payloads**:

1. `src/lib/crypto.ts` - Loads a WASM module (`/pkg/device_wasm.js`) for encryption/decryption
2. `src/lib/api.ts` - `ApiClient` class wraps all API calls:
   - `init(securityKey)` derives encryption key from user's security key
   - Encrypted endpoints: `/api/spools`, `/api/spools-in-printers`, `/api/spools/add-edit`, `/api/spools/delete`, `/api/spool-kinfo`, `/api/printers-filament-pa`
   - Unencrypted endpoints: `/spools-catalog`, `/filament-brands`
3. Spool data is received as CSV (not JSON) and parsed by `parseSpoolsCsv()`

### State Management

- `src/context/AppContext.tsx` - Single Preact context for all app state
- `useApp()` hook provides: authentication, spools data, CRUD operations
- Security key stored in URL hash (`#sk=...`) for persistence

### Key Data Types (from `src/lib/api.ts`)

- `Spool` - Main spool entity with material, color, weight tracking
- `KInfo` - Nested pressure advance settings per printer/extruder/nozzle
- `SpoolsInPrinters` - Maps tag IDs to printer serials

### Dev Server Proxy

The Vite config proxies API requests to a SpoolEase device at `192.168.255.105`. Change this IP in `vite.config.ts` if your device has a different address.

### Build Output

Production builds go to `../../bins/0.5/inventory-new` for deployment to ESP32 devices. Output files use simple names (`inventory.js`) for embedded filesystem compatibility.

## Important Notes

- Uses Preact with `react`/`react-dom` aliased to `preact/compat` in vite.config.ts
- Path alias `@/*` maps to `src/*`
- CSS uses Tailwind with CSS variables for theming (e.g., `var(--accent-color)`)
