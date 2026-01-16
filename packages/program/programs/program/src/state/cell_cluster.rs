use anchor_lang::prelude::*;

#[account]
pub struct CellCluster {
    pub cluster_id: u64,                    // Unique cluster identifier
    pub bounds: [i32; 4],                   // [min_lat, max_lat, min_lng, max_lng] in microdegrees
    pub cell_count: u32,                    // Number of active cells
    pub cells: Vec<CellData>,               // Max ~400 cells per cluster (~32KB)
    pub last_updated: i64,                  // Unix timestamp
    pub bump: u8,                           // PDA bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CellData {
    pub coordinates: [i32; 2],              // [lat, lng] in microdegrees
    pub token_mint: Pubkey,                 // Token contract address (32 bytes)
    pub logo_uri: String,                   // Resolved logo URL (max 200 chars)
    pub logo_hash: [u8; 32],                // Content hash for integrity
    pub placed_by: Pubkey,                  // User wallet address
    pub placed_at: i64,                     // Unix timestamp
    pub overwrite_count: u16,               // Times this cell was overwritten
}

impl CellCluster {
    // Calculate space needed for account
    pub const MAX_CELLS: usize = 10;  // Further reduced to minimize rent cost for tests
    
    // Base size calculation:
    // 8 (discriminator) + 8 (cluster_id) + 16 (bounds) + 4 (cell_count) + 4 (vec length) + 8 (last_updated) + 1 (bump)
    pub const BASE_SIZE: usize = 8 + 8 + 16 + 4 + 4 + 8 + 1;
    
    // CellData size: 8 (coordinates) + 32 (token_mint) + 4 (string length) + 200 (logo_uri) + 32 (logo_hash) + 32 (placed_by) + 8 (placed_at) + 2 (overwrite_count)
    pub const CELL_DATA_SIZE: usize = 8 + 32 + 4 + 200 + 32 + 32 + 8 + 2;
    
    pub const MAX_SIZE: usize = Self::BASE_SIZE + (Self::CELL_DATA_SIZE * Self::MAX_CELLS);

    pub fn find_cell_index(&self, lat: i32, lng: i32) -> Option<usize> {
        self.cells.iter().position(|cell| {
            cell.coordinates[0] == lat && cell.coordinates[1] == lng
        })
    }

    pub fn add_or_update_cell(&mut self, cell_data: CellData) -> Result<bool> {
        let lat = cell_data.coordinates[0];
        let lng = cell_data.coordinates[1];
        
        if let Some(index) = self.find_cell_index(lat, lng) {
            // Update existing cell (overwrite)
            self.cells[index] = cell_data;
            Ok(true) // true = overwrite
        } else {
            // Add new cell
            require!(
                self.cells.len() < Self::MAX_CELLS,
                crate::error::SolplaceError::ClusterFull
            );
            self.cells.push(cell_data);
            self.cell_count += 1;
            Ok(false) // false = new placement
        }
    }
}

// Helper function to calculate cluster ID from coordinates
pub fn get_cluster_id(lat: i32, lng: i32) -> u64 {
    let cluster_lat = lat / 100_000; // ~10km resolution
    let cluster_lng = lng / 100_000;
    ((cluster_lat as u64) << 32) | (cluster_lng as u64)
}

// Helper function to calculate cluster bounds
pub fn get_cluster_bounds(cluster_id: u64) -> [i32; 4] {
    let cluster_lat = (cluster_id >> 32) as i32;
    let cluster_lng = (cluster_id & 0xFFFFFFFF) as i32;
    
    let min_lat = cluster_lat * 100_000;
    let max_lat = (cluster_lat + 1) * 100_000 - 1;
    let min_lng = cluster_lng * 100_000;
    let max_lng = (cluster_lng + 1) * 100_000 - 1;
    
    [min_lat, max_lat, min_lng, max_lng]
}
