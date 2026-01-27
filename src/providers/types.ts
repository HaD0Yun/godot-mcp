/**
 * Asset Provider Interface & Types
 * 
 * This module defines the common interface for all asset providers (Poly Haven, AmbientCG, etc.)
 * enabling a unified multi-source asset search and download system.
 */

/**
 * Supported asset types across all providers
 */
export type AssetType = 'models' | 'textures' | 'hdris' | 'audio' | '2d';

/**
 * Asset search result from any provider
 */
export interface AssetSearchResult {
  id: string;
  name: string;
  provider: string;
  assetType: AssetType;
  categories: string[];
  tags: string[];
  license: 'CC0' | 'CC-BY' | 'Public Domain' | string;
  previewUrl?: string;
  downloadUrl?: string;
  score: number;  // Relevance score for sorting
}

/**
 * Download result after fetching an asset
 */
export interface AssetDownloadResult {
  success: boolean;
  assetId: string;
  provider: string;
  localPath: string;       // Path relative to project (e.g., "downloaded_assets/ambientcg/rock_01.zip")
  fileName: string;
  fileSize?: number;
  license: string;
  attribution: string;     // Full attribution text for CREDITS.md
  sourceUrl: string;       // Original URL for reference
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  displayName: string;
  baseUrl: string;
  apiUrl?: string;
  userAgent: string;
  priority: number;        // Lower = higher priority (1 = first)
  supportedTypes: AssetType[];
  requiresAuth: boolean;
  license: string;
}

/**
 * Search options passed to providers
 */
export interface SearchOptions {
  keyword: string;
  assetType?: AssetType;
  maxResults?: number;
  categories?: string[];
  resolution?: string;
}

/**
 * Download options
 */
export interface DownloadOptions {
  assetId: string;
  projectPath: string;
  targetFolder?: string;
  resolution?: string;
  format?: string;
}

/**
 * Interface that all asset providers must implement
 */
export interface IAssetProvider {
  readonly config: ProviderConfig;
  
  /**
   * Search for assets matching the keyword
   */
  search(options: SearchOptions): Promise<AssetSearchResult[]>;
  
  /**
   * Download a specific asset to the project
   */
  download(options: DownloadOptions): Promise<AssetDownloadResult>;
  
  /**
   * Check if this provider supports the given asset type
   */
  supportsType(type: AssetType): boolean;
  
  /**
   * Get the attribution text for an asset
   */
  getAttribution(assetId: string, assetName: string): string;
}

/**
 * Provider priority order (used for sequential search)
 */
export const PROVIDER_PRIORITY: Record<string, number> = {
  'polyhaven': 1,
  'ambientcg': 2,
  'kenney': 3,
  'cc0lib': 4,
  'quaternius': 5,
  'nasa3d': 6,
  'opengameart': 7,
  'smithsonian': 8,
};
