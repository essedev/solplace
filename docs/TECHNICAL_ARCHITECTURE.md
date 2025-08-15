# Technical Architecture Document

## Context
Building on the collaborative map concept inspired by Wplace.live, this project is fully on-chain using Solana to ensure decentralization, real-time interactions, and crypto-native appeal. The decision to avoid traditional backend/DB setups eliminates central points of failure, while Solana's high throughput (thousands of TPS) and low fees (~0.000005 SOL per tx) make it ideal for frequent user actions like placements. No holding requirements in MVP to reduce UX friction.

## General Concept Description (Technical Lens)
The system is a decentralized application (dApp) where the world map serves as a canvas for token logos. State (e.g., which cell has which token) is stored in Solana accounts, queried via RPC for reading and updated via transactions for writing. Key tech principles:
- **On-Chain Focus**: All critical data and logic reside on Solana for transparency and immutability.
- **Real-Time**: Use Solana websockets for live updates without polling.
- **Scalability**: Grid-based map avoids infinite canvas issues; oracles for dynamic elements if expanded.

## MVP Technical Details
- **Frontend**: Built with React/Vue for UI; integrate MapLibre/Leaflet for interactive mapping with OpenStreetMap data. Connect wallets via @solana/web3.js. Display logos by fetching metadata (e.g., image URLs) from token accounts.
- **Backend (On-Chain Program)**: Use Anchor framework (Rust) to create a Solana program:
  - **Accounts Structure**: Program Derived Addresses (PDAs) for each grid cell (seeded by lat/long coords). Each PDA holds: token contract address, logo metadata, placement timestamp, and owner wallet.
  - **Instructions**: 
    - `initialize_cell`: Create a new cell if empty.
    - `place_logo`: Validate token contract (via RPC check), charge fee, update PDA.
    - `overwrite_logo`: Higher fee, update existing PDA.
  - **Validation**: Ensure contract exists using Solana's token program queries; fetch logos via off-chain APIs (e.g., Helius) but store hashes on-chain for integrity.
- **Grid Management**: Map divided into fixed-resolution grid (e.g., using GeoHash for coord-to-cell conversion). Handle zoom by aggregating cells client-side (e.g., show averaged logos at low zoom).
- **Pricing Mechanics**: Fees collected via transaction lamports; dynamic adjustments possible with oracles (e.g., Pyth for location-based multipliers).
- **Reading/Writing**:
  - **Read**: Public RPC queries (getProgramAccounts) to fetch cell data; no wallet needed.
  - **Write**: Wallet-signed transactions; use websockets (accountSubscribe) for real-time broadcasts.
- **Deployment**: Test on devnet; deploy program via solana-cli. Host frontend on Vercel/Netlify.

## Tecnicity (Deep Dive)
- **Oracles Integration**: If dynamic pricing is added, use Pyth or Switchboard: Programs read on-chain feeds (e.g., Pyth's price aggregators) via instructions. Avoid traditional APIs for security—oracles provide decentralized, verifiable data (aggregated from multiple nodes with cryptographic proofs) to prevent manipulation.
- **Wallet Integration**: Mandatory for writes (signing tx); optional for reads. Libraries like wallet-adapter handle connections.
- **Database Equivalent**: Solana accounts act as the "DB"—immutable, distributed, and queryable via RPC. For large-scale, use indexing services like The Graph if needed, but avoid in MVP.
- **Pro/Con vs Traditional**: As discussed, on-chain pros include trustlessness and low ops costs; cons are dev complexity (Rust learning curve) and minor UX friction. Mitigate with clear tutorials.
- **Security**: Audit program for reentrancy/vulnerabilities; use Anchor's safety features. Rate-limit via on-chain cooldowns.

## Business Model (Technical Support)
- **Fee Handling**: On-chain transfers to a treasury PDA; burn via system instructions.
- **Analytics**: Track placements via event logs (emit_events in Anchor) for off-chain dashboards.

## Future Developments (Technical)
- **Upgrades**: Program upgrades via BPF loader for fixes; add modules for gamification (e.g., point-tracking PDAs).
- **Scalability**: Optimize with compressed accounts if cell count grows; integrate Solana's upcoming features like ZK compression.
- **Extensions**: Add VRF (verifiable randomness) from Switchboard for fair events; explore token extensions for custom logo behaviors.

This document outlines the technical foundation, ensuring a robust, decentralized build.