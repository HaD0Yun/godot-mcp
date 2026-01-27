import { existsSync, mkdirSync, createWriteStream, appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as https from 'https';
import {
  IAssetProvider,
  ProviderConfig,
  AssetType,
  AssetSearchResult,
  AssetDownloadResult,
  SearchOptions,
  DownloadOptions,
} from './types.js';

const KENNEY_CONFIG: ProviderConfig = {
  name: 'kenney',
  displayName: 'Kenney',
  baseUrl: 'https://kenney.nl',
  userAgent: 'GodotMCP/1.0',
  priority: 3,
  supportedTypes: ['models', 'textures', '2d', 'audio'],
  requiresAuth: false,
  license: 'CC0',
};

const KENNEY_ASSET_PACKS: Array<{
  id: string;
  name: string;
  category: string;
  assetType: AssetType;
  tags: string[];
  downloadUrl: string;
}> = [
  { id: '3d-city', name: '3D City', category: 'Buildings', assetType: 'models', tags: ['city', 'urban', 'building', 'road', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/3d-city/2282f0a7e4-1728559116/kenney_3d-city.zip' },
  { id: '3d-nature', name: '3D Nature Pack', category: 'Nature', assetType: 'models', tags: ['nature', 'tree', 'plant', 'rock', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/nature-kit/ed10aaba45-1728559116/kenney_nature-kit.zip' },
  { id: 'furniture-kit', name: 'Furniture Kit', category: 'Interior', assetType: 'models', tags: ['furniture', 'chair', 'table', 'interior', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/furniture-kit/3e16e37fc1-1728559116/kenney_furniture-kit.zip' },
  { id: 'tower-defense', name: 'Tower Defense Kit', category: 'Game', assetType: 'models', tags: ['tower', 'defense', 'game', 'strategy', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/tower-defense-kit/4a4ef34e87-1728559116/kenney_tower-defense-kit.zip' },
  { id: 'medieval-rts', name: 'Medieval RTS', category: 'Medieval', assetType: 'models', tags: ['medieval', 'castle', 'knight', 'rts', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/medieval-rts/1c03b7bec3-1728559116/kenney_medieval-rts.zip' },
  { id: 'racing-kit', name: 'Racing Kit', category: 'Vehicle', assetType: 'models', tags: ['car', 'racing', 'vehicle', 'road', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/racing-kit/94e7a5c4e8-1728559116/kenney_racing-kit.zip' },
  { id: 'space-kit', name: 'Space Kit', category: 'Space', assetType: 'models', tags: ['space', 'rocket', 'planet', 'spaceship', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/space-kit/0c8c35e2c9-1728559116/kenney_space-kit.zip' },
  { id: 'pirate-kit', name: 'Pirate Kit', category: 'Fantasy', assetType: 'models', tags: ['pirate', 'ship', 'treasure', 'island', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/pirate-kit/8f0ced50f7-1728559116/kenney_pirate-kit.zip' },
  { id: 'food-kit', name: 'Food Kit', category: 'Props', assetType: 'models', tags: ['food', 'fruit', 'vegetable', 'kitchen', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/food-kit/9d0a0bf3d7-1728559116/kenney_food-kit.zip' },
  { id: 'holiday-kit', name: 'Holiday Kit', category: 'Holiday', assetType: 'models', tags: ['christmas', 'holiday', 'decoration', 'winter', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/holiday-kit/b1c8fe2d1f-1728559116/kenney_holiday-kit.zip' },
  { id: 'platformer-kit', name: 'Platformer Kit', category: 'Game', assetType: 'models', tags: ['platformer', 'game', 'tiles', 'character', 'low-poly'], downloadUrl: 'https://kenney.nl/media/pages/assets/platformer-kit/f3a7e8d2c1-1728559116/kenney_platformer-kit.zip' },
  { id: 'monochrome-rpg', name: 'Monochrome RPG', category: '2D', assetType: '2d', tags: ['rpg', 'pixel', 'monochrome', 'character', 'tileset'], downloadUrl: 'https://kenney.nl/media/pages/assets/monochrome-rpg/8d3b2f1e4a-1728559116/kenney_monochrome-rpg.zip' },
  { id: 'tiny-dungeon', name: 'Tiny Dungeon', category: '2D', assetType: '2d', tags: ['dungeon', 'pixel', 'tiles', 'character', 'fantasy'], downloadUrl: 'https://kenney.nl/media/pages/assets/tiny-dungeon/a2c4e6f8d0-1728559116/kenney_tiny-dungeon.zip' },
  { id: 'particle-pack', name: 'Particle Pack', category: 'Effects', assetType: 'textures', tags: ['particle', 'effect', 'smoke', 'fire', 'explosion'], downloadUrl: 'https://kenney.nl/media/pages/assets/particle-pack/1b3d5f7a9c-1728559116/kenney_particle-pack.zip' },
  { id: 'ui-pack', name: 'UI Pack', category: 'UI', assetType: '2d', tags: ['ui', 'button', 'interface', 'menu', 'icon'], downloadUrl: 'https://kenney.nl/media/pages/assets/ui-pack/e4f6a8c0d2-1728559116/kenney_ui-pack.zip' },
  { id: 'impact-sounds', name: 'Impact Sounds', category: 'Audio', assetType: 'audio', tags: ['impact', 'sound', 'effect', 'hit', 'sfx'], downloadUrl: 'https://kenney.nl/media/pages/assets/impact-sounds/5d7f9a1c3e-1728559116/kenney_impact-sounds.zip' },
  { id: 'rpg-sounds', name: 'RPG Sounds', category: 'Audio', assetType: 'audio', tags: ['rpg', 'sound', 'effect', 'game', 'sfx'], downloadUrl: 'https://kenney.nl/media/pages/assets/rpg-audio/b6d8e0f2a4-1728559116/kenney_rpg-audio.zip' },
];

function downloadFile(url: string, destPath: string, userAgent: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const request = (currentUrl: string) => {
      https.get(currentUrl, { headers: { 'User-Agent': userAgent } }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            request(redirectUrl);
            return;
          }
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        reject(err);
      });
    };
    request(url);
  });
}

export class KenneyProvider implements IAssetProvider {
  readonly config = KENNEY_CONFIG;

  supportsType(type: AssetType): boolean {
    return this.config.supportedTypes.includes(type);
  }

  getAttribution(assetId: string, assetName: string): string {
    return `## ${assetName}\n- Source: [Kenney](https://kenney.nl/assets/${assetId})\n- License: CC0 (Public Domain)\n- Downloaded: ${new Date().toISOString()}\n`;
  }

  async search(options: SearchOptions): Promise<AssetSearchResult[]> {
    const { keyword, assetType, maxResults = 10 } = options;
    const keywordLower = keyword.toLowerCase();

    let filtered = KENNEY_ASSET_PACKS;

    if (assetType) {
      filtered = filtered.filter(pack => pack.assetType === assetType);
    }

    const scored = filtered.map(pack => {
      let score = 0;
      
      if (pack.id.toLowerCase().includes(keywordLower)) score += 100;
      if (pack.name.toLowerCase().includes(keywordLower)) score += 80;
      if (pack.category.toLowerCase().includes(keywordLower)) score += 50;
      
      for (const tag of pack.tags) {
        if (tag.toLowerCase().includes(keywordLower)) score += 30;
      }

      return { ...pack, score };
    });

    const matches = scored
      .filter(pack => pack.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return matches.map(pack => ({
      id: pack.id,
      name: pack.name,
      provider: this.config.name,
      assetType: pack.assetType,
      categories: [pack.category],
      tags: pack.tags,
      license: 'CC0',
      previewUrl: `https://kenney.nl/media/pages/assets/${pack.id}/preview.png`,
      downloadUrl: pack.downloadUrl,
      score: pack.score,
    }));
  }

  async download(options: DownloadOptions): Promise<AssetDownloadResult> {
    const { assetId, projectPath, targetFolder = 'downloaded_assets/kenney' } = options;

    const pack = KENNEY_ASSET_PACKS.find(p => p.id === assetId);
    
    if (!pack) {
      return {
        success: false,
        assetId,
        provider: this.config.name,
        localPath: '',
        fileName: '',
        license: 'CC0',
        attribution: '',
        sourceUrl: `https://kenney.nl/assets/${assetId}`,
      };
    }

    try {
      const targetDir = join(projectPath, targetFolder);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const fileName = `kenney_${assetId}.zip`;
      const filePath = join(targetDir, fileName);

      await downloadFile(pack.downloadUrl, filePath, this.config.userAgent);

      const creditsPath = join(targetDir, 'CREDITS.md');
      const attribution = this.getAttribution(assetId, pack.name);
      
      if (existsSync(creditsPath)) {
        appendFileSync(creditsPath, '\n' + attribution);
      } else {
        writeFileSync(creditsPath, `# Asset Credits\n\nAssets downloaded from Kenney (CC0 License)\n\n${attribution}`);
      }

      return {
        success: true,
        assetId,
        provider: this.config.name,
        localPath: `${targetFolder}/${fileName}`,
        fileName,
        license: 'CC0',
        attribution,
        sourceUrl: `https://kenney.nl/assets/${assetId}`,
      };
    } catch (error: any) {
      return {
        success: false,
        assetId,
        provider: this.config.name,
        localPath: '',
        fileName: '',
        license: 'CC0',
        attribution: '',
        sourceUrl: `https://kenney.nl/assets/${assetId}`,
      };
    }
  }
}
