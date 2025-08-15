/**
 * Grid utilities for Solplace coordinate system
 *
 * The grid system divides the world into discrete cells where each cell can contain one logo.
 * Coordinates are stored in microdegrees (degrees * 1_000_000) in the Rust program.
 */

// Grid cell size in microdegrees (approximately 100m x 100m)
export const GRID_CELL_SIZE = 1000 // microdegrees

/**
 * Convert geographic coordinates to grid cell coordinates
 */
export function latLngToGridCell(lat: number, lng: number): [number, number] {
	// Convert to microdegrees
	const latMicro = Math.round(lat * 1_000_000)
	const lngMicro = Math.round(lng * 1_000_000)

	// Snap to grid
	const gridLat = Math.floor(latMicro / GRID_CELL_SIZE) * GRID_CELL_SIZE
	const gridLng = Math.floor(lngMicro / GRID_CELL_SIZE) * GRID_CELL_SIZE

	return [gridLat, gridLng]
}

/**
 * Convert grid cell coordinates back to geographic coordinates
 */
export function gridCellToLatLng(
	gridLat: number,
	gridLng: number
): [number, number] {
	const lat = gridLat / 1_000_000
	const lng = gridLng / 1_000_000
	return [lat, lng]
}

/**
 * Get all grid cells visible in the given bounds
 */
export function getVisibleGridCells(bounds: {
	minLat: number
	maxLat: number
	minLng: number
	maxLng: number
}): Array<[number, number]> {
	const cells: Array<[number, number]> = []

	// Convert bounds to microdegrees and snap to grid
	const minLatMicro =
		Math.floor((bounds.minLat * 1_000_000) / GRID_CELL_SIZE) *
		GRID_CELL_SIZE
	const maxLatMicro =
		Math.ceil((bounds.maxLat * 1_000_000) / GRID_CELL_SIZE) * GRID_CELL_SIZE
	const minLngMicro =
		Math.floor((bounds.minLng * 1_000_000) / GRID_CELL_SIZE) *
		GRID_CELL_SIZE
	const maxLngMicro =
		Math.ceil((bounds.maxLng * 1_000_000) / GRID_CELL_SIZE) * GRID_CELL_SIZE

	// Generate all grid cells in the bounds
	for (let lat = minLatMicro; lat <= maxLatMicro; lat += GRID_CELL_SIZE) {
		for (let lng = minLngMicro; lng <= maxLngMicro; lng += GRID_CELL_SIZE) {
			cells.push([lat, lng])
		}
	}

	return cells
}

/**
 * Get the center point of a grid cell in geographic coordinates
 */
export function getGridCellCenter(
	gridLat: number,
	gridLng: number
): [number, number] {
	const centerLat = (gridLat + GRID_CELL_SIZE / 2) / 1_000_000
	const centerLng = (gridLng + GRID_CELL_SIZE / 2) / 1_000_000
	return [centerLat, centerLng]
}

/**
 * Get the bounds of a grid cell in geographic coordinates
 */
export function getGridCellBounds(
	gridLat: number,
	gridLng: number
): {
	minLat: number
	maxLat: number
	minLng: number
	maxLng: number
} {
	return {
		minLat: gridLat / 1_000_000,
		maxLat: (gridLat + GRID_CELL_SIZE) / 1_000_000,
		minLng: gridLng / 1_000_000,
		maxLng: (gridLng + GRID_CELL_SIZE) / 1_000_000
	}
}

/**
 * Calculate the approximate size of a grid cell in meters at a given latitude
 */
export function getGridCellSizeInMeters(lat: number): {
	width: number
	height: number
} {
	// At the equator, 1 degree ≈ 111,320 meters
	// Height is constant
	const heightInMeters = (GRID_CELL_SIZE / 1_000_000) * 111_320

	// Width varies with latitude (gets smaller towards poles)
	const widthInMeters = heightInMeters * Math.cos((lat * Math.PI) / 180)

	return {
		width: widthInMeters,
		height: heightInMeters
	}
}
