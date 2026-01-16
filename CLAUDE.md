# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SolPlace is a collaborative, on-chain token placement map on Solana - think Reddit's r/Place but for Solana token logos on a geographic grid. Users place token logos on map cells, creating territory wars and community engagement.

## Architecture

**Monorepo Structure:**
- `packages/program/` - Solana on-chain program (Anchor/Rust)
- `packages/web/` - React frontend (Vite/TypeScript)
- `packages/shared/` - TypeScript client library shared between packages

**Tech Stack:**
- Blockchain: Solana with Anchor 0.31.1
- Frontend: React 19, Zustand 5, MapLibre GL, Tailwind CSS 4
- Build: Vite 7, pnpm workspaces
- Language: TypeScript 5.8+ (strict mode in shared), Rust

## Common Commands

```bash
# Root (runs all packages in parallel)
pnpm dev              # Start all development servers
pnpm build            # Build all packages
pnpm test             # Run all tests

# Web package
pnpm --filter web dev      # Vite dev server with HMR
pnpm --filter web build    # TypeScript check + Vite build
pnpm --filter web lint     # ESLint

# Program package
pnpm --filter program build         # anchor build
pnpm --filter program deploy        # anchor deploy
pnpm --filter program test          # anchor test (ts-mocha, 120s timeout)
pnpm --filter program dev:watch     # cargo watch -x check
pnpm --filter program generate:idl:types  # Generate TS types from IDL

# Shared package
pnpm --filter shared build      # tsc compilation
pnpm --filter shared test       # jest
pnpm --filter shared type-check # tsc --noEmit
```

## On-Chain Architecture

**PDAs (Program Derived Addresses):**
- Logo placements: seed `logo_placement` + latitude + longitude (microdegrees)
- User cooldowns: seed `cooldown` + user pubkey

**Key Constants (must stay synchronized between Rust and TypeScript):**
- Base placement fee: 0.001 SOL (1,000,000 lamports)
- Overwrite multiplier: 5x
- User cooldown: 30 seconds
- Coordinates stored as microdegrees (×1,000,000)

**Program ID:** `Fw64bA7dMN1nzc1X82vsLydU63yHuBSNGHyozsZAqQBP` (devnet)

## Frontend Architecture

**State Management (Zustand slices):**
- `client-slice.ts` - Program client and connection state
- `map-slice.ts` - Map viewport and visibility
- `user-slice.ts` - User placements and cooldown
- `ui-slice.ts` - Modals, selected cell, fee estimation

**Key Components:**
- `SolplaceMap.tsx` - MapLibre map with logo layer
- `TokenPlacer.tsx` - Logo placement modal/workflow
- `FeeEstimator.tsx` - Dynamic fee display on hover
- `CooldownTimer.tsx` - User rate limit countdown

## Shared Library

The `packages/shared/` library provides:
- `SolplaceClient` - Main Anchor program wrapper
- `LogoManager` - Logo resolution with multi-source fallback chain: Metaplex → Pump.fun → Jupiter → DexScreener → Identicon
- Grid utilities for coordinate conversion and PDA derivation
- TypeScript types mirroring Rust structs

See `packages/shared/README.md` for detailed API documentation.

## Key Patterns

- **No backend server** - All state is on-chain or derived from token metadata APIs
- **Coordinate precision** - Always use microdegrees (integer math) to avoid floating-point issues
- **Fee calculation** - Debounced on map hover for performance
- **Wallet integration** - Solana Wallet Adapter with multiple wallet support

## Environment Variables

Web package uses `.env`:
```
VITE_RPC_ENDPOINT=https://api.devnet.solana.com
VITE_SOLPLACE_PROGRAM_ID=<program-id>
```

## Documentation

Detailed design docs in `/docs/`:
- `PROJECT_CONCEPT.md` - Vision and use cases
- `TECHNICAL_ARCHITECTURE.md` - On-chain design, PDA structure
- `MVP_PLAN.md` - Feature scope
- `BUSINESS_MODEL.md` - Fee distribution
