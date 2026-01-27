import {
  IAssetProvider,
  AssetType,
  AssetSearchResult,
  AssetDownloadResult,
  SearchOptions,
  DownloadOptions,
  PROVIDER_PRIORITY,
} from './types.js';
import { PolyHavenProvider } from './polyhaven.js';
import { AmbientCGProvider } from './ambientcg.js';
import { KenneyProvider } from './kenney.js';

export class AssetManager {
  private providers: Map<string, IAssetProvider> = new Map();
  private sortedProviders: IAssetProvider[] = [];

  constructor() {
    this.registerProvider(new PolyHavenProvider());
    this.registerProvider(new AmbientCGProvider());
    this.registerProvider(new KenneyProvider());
    
    this.sortProvidersByPriority();
  }

  private registerProvider(provider: IAssetProvider): void {
    this.providers.set(provider.config.name, provider);
  }

  private sortProvidersByPriority(): void {
    this.sortedProviders = Array.from(this.providers.values()).sort(
      (a, b) => (PROVIDER_PRIORITY[a.config.name] || 99) - (PROVIDER_PRIORITY[b.config.name] || 99)
    );
  }

  getProviderNames(): string[] {
    return this.sortedProviders.map(p => p.config.name);
  }

  getProviderInfo(): Array<{ name: string; displayName: string; priority: number; types: AssetType[] }> {
    return this.sortedProviders.map(p => ({
      name: p.config.name,
      displayName: p.config.displayName,
      priority: p.config.priority,
      types: p.config.supportedTypes,
    }));
  }

  async searchAll(options: SearchOptions): Promise<AssetSearchResult[]> {
    const { assetType, maxResults = 10 } = options;
    const allResults: AssetSearchResult[] = [];

    for (const provider of this.sortedProviders) {
      if (assetType && !provider.supportsType(assetType)) {
        continue;
      }

      try {
        const results = await provider.search(options);
        allResults.push(...results);
      } catch (error) {
        console.error(`[AssetManager] Search failed for ${provider.config.name}: ${error}`);
      }
    }

    return allResults
      .sort((a, b) => {
        const priorityA = PROVIDER_PRIORITY[a.provider] || 99;
        const priorityB = PROVIDER_PRIORITY[b.provider] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return b.score - a.score;
      })
      .slice(0, maxResults);
  }

  async searchSequential(options: SearchOptions): Promise<AssetSearchResult[]> {
    const { assetType, maxResults = 5 } = options;

    for (const provider of this.sortedProviders) {
      if (assetType && !provider.supportsType(assetType)) {
        continue;
      }

      try {
        const results = await provider.search({ ...options, maxResults });
        if (results.length > 0) {
          return results;
        }
      } catch (error) {
        console.error(`[AssetManager] Search failed for ${provider.config.name}: ${error}`);
      }
    }

    return [];
  }

  async searchProvider(providerName: string, options: SearchOptions): Promise<AssetSearchResult[]> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }
    return provider.search(options);
  }

  async download(options: DownloadOptions & { provider?: string }): Promise<AssetDownloadResult> {
    const { provider: providerName, assetId } = options;

    if (providerName) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return {
          success: false,
          assetId,
          provider: providerName,
          localPath: '',
          fileName: '',
          license: '',
          attribution: '',
          sourceUrl: '',
        };
      }
      return provider.download(options);
    }

    for (const provider of this.sortedProviders) {
      try {
        const result = await provider.download(options);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.error(`[AssetManager] Download failed for ${provider.config.name}: ${error}`);
      }
    }

    return {
      success: false,
      assetId,
      provider: 'unknown',
      localPath: '',
      fileName: '',
      license: '',
      attribution: '',
      sourceUrl: '',
    };
  }
}

export const assetManager = new AssetManager();
