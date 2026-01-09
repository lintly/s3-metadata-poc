# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an S3 metadata proof-of-concept built with React 19, TypeScript, and Vite. The project is currently in early development with a fresh Vite template setup.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start development server with HMR
pnpm dev

# Run TypeScript compiler and build for production
pnpm build

# Run ESLint
pnpm lint

# Preview production build
pnpm preview
```

## Tech Stack

- **React**: 19.2.0 (latest with React Compiler support available but not enabled)
- **TypeScript**: 5.9.3 with strict mode enabled
- **Build Tool**: Vite 7.x with @vitejs/plugin-react (Babel-based Fast Refresh)
- **Linting**: ESLint 9.x (flat config) with React Hooks and React Refresh plugins

## Project Structure

```
src/
├── main.tsx          # React app entry point with StrictMode
├── App.tsx           # Root component (currently boilerplate)
├── App.css           # Component styles
└── index.css         # Global styles
```

## TypeScript Configuration

The project uses a project references setup with two configurations:
- `tsconfig.app.json`: Application code in `src/` (ES2022, DOM libs, bundler module resolution)
- `tsconfig.node.json`: Vite config files (Node environment)

Key TypeScript settings in effect:
- Strict mode enabled
- `noUnusedLocals` and `noUnusedParameters` enabled
- `verbatimModuleSyntax` for explicit imports/exports
- `erasableSyntaxOnly` (experimental) to catch syntax TypeScript can't transform

## ESLint Configuration

Uses flat config format (`eslint.config.js`) with:
- TypeScript ESLint recommended rules
- React Hooks rules (enforces Rules of Hooks)
- React Refresh rules (validates Fast Refresh compatibility)
- `dist/` ignored globally

The README suggests optional stricter linting with type-aware rules (`recommendedTypeChecked` or `strictTypeChecked`) but this is not currently configured.

## Build System

Vite is configured with minimal setup:
- React plugin with Babel transform (alternative: SWC via @vitejs/plugin-react-swc)
- Hot Module Replacement (HMR) enabled by default
- Production builds use TypeScript compiler check (`tsc -b`) before Vite bundling
