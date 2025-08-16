# Zustand Migration Plan - SolPlace

## Overview

This document outlines the complete migration plan from React state management to Zustand for the SolPlace project. The migration addresses critical issues with state management, particularly the modal reset problem and performance optimization.

## Current State Analysis

### Problems Identified

1. **Modal Reset Issue**: Opening TokenPlacer modal causes map reinitialization
2. **Callback Dependency Hell**: useEffect dependencies cause unnecessary re-renders
3. **Client Duplication**: SolplaceClient created in both App.tsx and SolplaceMap.tsx
4. **Prop Drilling**: Complex state passing between components
5. **Performance Issues**: Excessive re-renders due to state changes
6. **State Inconsistency**: Risk of desynchronized state between components

### Current State Distribution

```
App.tsx:
├── selectedLocation
├── placementFee
├── userCooldown
├── isPlacing
├── showPlacer
├── showLeaderboard
├── currentBounds
├── currentCellLogo
└── client (SolplaceClient)

SolplaceMap.tsx:
├── visibleLogos
├── currentZoom
├── isLoaded
└── solplaceClient (duplicate)
```

## Migration Strategy

### Phase 1: Setup & Core Store (Week 1)

#### 1.1 Install Dependencies

```bash
pnpm add zustand
pnpm add @types/node # if needed for devtools
```

#### 1.2 Create Core Store Structure

```typescript
// packages/web/src/stores/solplace-store.ts
interface SolplaceStore {
	// Core Client & Connection
	client: SolplaceClient | null
	isClientInitialized: boolean

	// Map State
	mapBounds: MapBounds | null
	visibleLogos: LogoPlacement[]
	mapZoom: number
	isMapLoaded: boolean

	// User State
	userCooldown: UserCooldown | null
	isPlacing: boolean

	// UI State
	showPlacer: boolean
	showLeaderboard: boolean
	selectedLocation: { lat: number; lng: number } | null

	// Current Cell State
	placementFee: PlacementFee | null
	currentCellLogo: LogoPlacement | null

	// Actions
	initializeClient: (
		connection: Connection,
		wallet: AnchorWallet
	) => Promise<void>
	setMapBounds: (bounds: MapBounds) => void
	setVisibleLogos: (logos: LogoPlacement[]) => void
	setSelectedLocation: (location: { lat: number; lng: number } | null) => void
	calculateFee: (lat: number, lng: number) => Promise<void>
	placeToken: (tokenMint: string) => Promise<string>
	loadUserCooldown: (publicKey: PublicKey) => Promise<void>
	setShowPlacer: (show: boolean) => void
	setShowLeaderboard: (show: boolean) => void
	reset: () => void
}
```

#### 1.3 Create Store Slices

```typescript
// packages/web/src/stores/slices/client-slice.ts
// packages/web/src/stores/slices/map-slice.ts
// packages/web/src/stores/slices/user-slice.ts
// packages/web/src/stores/slices/ui-slice.ts
```

### Phase 2: Client Management Migration (Week 1-2)

#### 2.1 Centralize SolplaceClient

-   Move client initialization to store
-   Remove duplicate client creation
-   Implement singleton pattern
-   Add connection status tracking

#### 2.2 Create Client Actions

```typescript
const clientActions = {
	initializeClient: async (connection, wallet) => {
		// Initialize client once
		// Set up subscriptions
		// Handle errors
	},

	validateClient: () => {
		// Ensure client is ready
		// Reconnect if needed
	}
}
```

### Phase 3: Map State Migration (Week 2)

#### 3.1 Migrate SolplaceMap.tsx

-   Remove internal state management
-   Use store for visibleLogos, mapBounds, zoom
-   Simplify useEffect dependencies
-   Fix modal reset issue

#### 3.2 Optimize Map Updates

```typescript
// Use selective subscriptions
const mapBounds = useSolplaceStore((state) => state.mapBounds)
const visibleLogos = useSolplaceStore((state) => state.visibleLogos)
```

### Phase 4: UI State Migration (Week 2-3)

#### 4.1 Migrate Modal States

-   Move showPlacer, selectedLocation to store
-   Remove prop drilling
-   Implement modal actions

#### 4.2 Migrate TokenPlacer.tsx

-   Use store for placementFee, currentCellLogo
-   Remove prop dependencies
-   Optimize re-renders

### Phase 5: User State Migration (Week 3)

#### 5.1 Migrate User-Related State

-   Move userCooldown, isPlacing to store
-   Centralize user operations
-   Add user session management

#### 5.2 Create User Actions

```typescript
const userActions = {
	placeToken: async (tokenMint: string) => {
		// Validate cooldown
		// Execute placement
		// Update states
		// Handle errors
	},

	checkUserCooldown: async () => {
		// Check and update cooldown
	}
}
```

### Phase 6: Performance Optimization (Week 3-4)

#### 6.1 Implement Selective Subscriptions

```typescript
// Instead of full store subscription
const { mapBounds, visibleLogos } = useSolplaceStore()

// Use selective subscriptions
const mapBounds = useSolplaceStore((state) => state.mapBounds)
const visibleLogos = useSolplaceStore((state) => state.visibleLogos)
```

#### 6.2 Add Computed Values

```typescript
const selectors = {
	canPlaceToken: (state) =>
		state.client &&
		state.selectedLocation &&
		!state.isPlacing &&
		(!state.userCooldown || state.userCooldown.canPlace),

	hasActiveModal: (state) => state.showPlacer || state.showLeaderboard
}
```

### Phase 7: Advanced Features (Week 4)

#### 7.1 Add Persistence

```typescript
import { persist } from 'zustand/middleware'

const store = persist(
  (set, get) => ({...}),
  {
    name: 'solplace-storage',
    partialize: (state) => ({
      showLeaderboard: state.showLeaderboard,
      // Other UI preferences
    })
  }
)
```

#### 7.2 Add DevTools

```typescript
import { devtools } from 'zustand/middleware'

const store = devtools(
  persist(...),
  { name: 'SolPlace Store' }
)
```

## Implementation Checklist

### Week 1: Foundation

-   [ ] Install Zustand dependencies
-   [ ] Create store structure and types
-   [ ] Implement client slice with initialization
-   [ ] Create store provider and hooks
-   [ ] Write unit tests for store actions

### Week 2: Core Migration

-   [ ] Migrate SolplaceMap.tsx to use store
-   [ ] Fix modal reset issue
-   [ ] Migrate UI state (modals, selected location)
-   [ ] Update TokenPlacer.tsx to use store
-   [ ] Remove prop drilling from App.tsx

### Week 3: User & Optimization

-   [ ] Migrate user state and cooldown management
-   [ ] Implement token placement through store
-   [ ] Add selective subscriptions
-   [ ] Optimize re-render performance
-   [ ] Add error handling and loading states

### Week 4: Polish & Advanced

-   [ ] Add persistence for UI preferences
-   [ ] Integrate DevTools for debugging
-   [ ] Add computed selectors
-   [ ] Performance testing and optimization
-   [ ] Documentation and code cleanup

## File Structure After Migration

```
packages/web/src/
├── stores/
│   ├── solplace-store.ts          # Main store
│   ├── types.ts                   # Store types
│   ├── selectors.ts              # Computed selectors
│   └── slices/
│       ├── client-slice.ts       # Client management
│       ├── map-slice.ts          # Map state
│       ├── user-slice.ts         # User state
│       └── ui-slice.ts           # UI state
├── hooks/
│   ├── use-solplace-store.ts     # Store hook
│   └── use-store-selectors.ts    # Selector hooks
└── components/
    ├── App.tsx                   # Simplified, no state
    ├── SolplaceMap.tsx          # Uses store
    ├── TokenPlacer.tsx          # Uses store
    └── ...
```

## Benefits Expected

### Immediate Benefits

-   ✅ **Fix modal reset issue**: No more map reinitialization
-   ✅ **Better performance**: Reduced re-renders
-   ✅ **Cleaner code**: No prop drilling
-   ✅ **Centralized logic**: Single source of truth

### Long-term Benefits

-   ✅ **Easier debugging**: DevTools integration
-   ✅ **Better testing**: Isolated store testing
-   ✅ **Scalability**: Easy to add new features
-   ✅ **Maintainability**: Clear separation of concerns

## Risk Mitigation

### Potential Risks

1. **Breaking changes**: During migration
2. **Performance regressions**: If not implemented correctly
3. **Learning curve**: Team adaptation

### Mitigation Strategies

1. **Gradual migration**: Phase-by-phase approach
2. **Comprehensive testing**: Unit and integration tests
3. **Rollback plan**: Git branching strategy
4. **Documentation**: Clear migration guide

## Testing Strategy

### Unit Tests

-   Store actions and reducers
-   Selectors and computed values
-   Client initialization logic

### Integration Tests

-   Component-store interactions
-   Modal workflows
-   Token placement flow

### Performance Tests

-   Re-render frequency
-   Memory usage
-   Load time comparisons

## Success Metrics

### Technical Metrics

-   [ ] Modal reset issue: Fixed
-   [ ] Re-render count: Reduced by 60%+
-   [ ] Bundle size: Increase <5KB
-   [ ] Load time: No regression

### Developer Experience

-   [ ] Code complexity: Reduced
-   [ ] Debugging: Improved with DevTools
-   [ ] Maintainability: Enhanced
-   [ ] Feature velocity: Increased

## Timeline Summary

| Week | Focus          | Deliverables                  |
| ---- | -------------- | ----------------------------- |
| 1    | Foundation     | Store setup, client migration |
| 2    | Core Migration | Map & UI state migration      |
| 3    | User State     | User operations, optimization |
| 4    | Polish         | Advanced features, testing    |

## Conclusion

This migration to Zustand will solve the current modal reset issue while providing a solid foundation for future development. The phased approach ensures minimal disruption while delivering immediate benefits.

The investment in proper state management will pay dividends in maintainability, performance, and developer experience as the SolPlace project continues to grow.
