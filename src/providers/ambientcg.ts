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

const AMBIENTCG_CONFIG: ProviderConfig = {
  name: 'ambientcg',
  displayName: 'AmbientCG',
  baseUrl: 'https://ambientcg.com',
  apiUrl: 'https://ambientcg.com/api/v2/full_json',
  userAgent: 'GodotMCP/1.0',
  priority: 2,
  supportedTypes: ['textures', 'models', 'hdris'],
  requiresAuth: false,
  license: 'CC0',
};

interface AmbientCGAsset {
  assetId: string;
  dataType: string;
  category: string;
  tags: string[];
  creationMethod: string;
  dimensionsMm?: number[];
  downloadLink: string;
  rawLink?: string;
  previewImage?: { [key: string]: string };
}

interface AmbientCGApiResponse {
  foundAssets: AmbientCGAsset[];
  numberOfResults: number;
}

function mapDataTypeToAssetType(dataType: string): AssetType {
  switch (dataType.toLowerCase()) {
    case 'material':
    case 'decal':
    case 'terrain':
      return 'textures';
    case '3dmodel':
      return 'models';
    case 'hdri':
      return 'hdris';
    default:
      return 'textures';
  }
}

function httpGet(url: string, userAgent: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': userAgent } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          httpGet(redirectUrl, userAgent).then(resolve).catch(reject);
          return;
        }
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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

export class AmbientCGProvider implements IAssetProvider {
  readonly config = AMBIENTCG_CONFIG;

  supportsType(type: AssetType): boolean {
    return this.config.supportedTypes.includes(type);
  }

  getAttribution(assetId: string, assetName: string): string {
    return `## ${assetName}\n- Source: [AmbientCG](https://ambientcg.com/view?id=${assetId})\n- License: CC0 (Public Domain)\n- Downloaded: ${new Date().toISOString()}\n`;
  }

  async search(options: SearchOptions): Promise<AssetSearchResult[]> {
    const { keyword, assetType, maxResults = 10 } = options;
    
    let typeFilter = '';
    if (assetType === 'textures') {
      typeFilter = '&type=Material,Decal,Terrain';
    } else if (assetType === 'models') {
      typeFilter = '&type=3DModel';
    } else if (assetType === 'hdris') {
      typeFilter = '&type=HDRI';
    }

    const searchUrl = `${this.config.apiUrl}?q=${encodeURIComponent(keyword)}&limit=${maxResults}${typeFilter}&include=downloadData,previewData`;

    try {
      const responseText = await httpGet(searchUrl, this.config.userAgent);
      const response: AmbientCGApiResponse = JSON.parse(responseText);

      if (!response.foundAssets || response.foundAssets.length === 0) {
        return [];
      }

      return response.foundAssets.map((asset, index) => {
        const previewUrl = asset.previewImage?.['256-PNG'] || asset.previewImage?.['512-PNG'] || '';
        
        return {
          id: asset.assetId,
          name: asset.assetId.replace(/_/g, ' '),
          provider: this.config.name,
          assetType: mapDataTypeToAssetType(asset.dataType),
          categories: asset.category ? [asset.category] : [],
          tags: asset.tags || [],
          license: 'CC0',
          previewUrl,
          downloadUrl: asset.downloadLink,
          score: 100 - index,
        };
      });
    } catch (error) {
      console.error(`[AmbientCG] Search failed: ${error}`);
      return [];
    }
  }

  async download(options: DownloadOptions): Promise<AssetDownloadResult> {
    const { assetId, projectPath, targetFolder = 'downloaded_assets/ambientcg', resolution = '2K' } = options;

    const detailUrl = `${this.config.apiUrl}?id=${assetId}&include=downloadData`;
    
    try {
      const responseText = await httpGet(detailUrl, this.config.userAgent);
      const response: AmbientCGApiResponse = JSON.parse(responseText);

      if (!response.foundAssets || response.foundAssets.length === 0) {
        throw new Error(`Asset not found: ${assetId}`);
      }

      const asset = response.foundAssets[0];
      let downloadUrl = asset.downloadLink;

      if (asset.rawLink) {
        downloadUrl = asset.rawLink;
      }

      if (!downloadUrl) {
        throw new Error(`No download URL for asset: ${assetId}`);
      }

      const targetDir = join(projectPath, targetFolder);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const fileName = `${assetId}.zip`;
      const filePath = join(targetDir, fileName);

      await downloadFile(downloadUrl, filePath, this.config.userAgent);

      const creditsPath = join(targetDir, 'CREDITS.md');
      const attribution = this.getAttribution(assetId, assetId);
      
      if (existsSync(creditsPath)) {
        appendFileSync(creditsPath, '\n' + attribution);
      } else {
        writeFileSync(creditsPath, `# Asset Credits\n\nAssets downloaded from various CC0 sources\n\n${attribution}`);
      }

      return {
        success: true,
        assetId,
        provider: this.config.name,
        localPath: `${targetFolder}/${fileName}`,
        fileName,
        license: 'CC0',
        attribution,
        sourceUrl: `https://ambientcg.com/view?id=${assetId}`,
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
        sourceUrl: `https://ambientcg.com/view?id=${assetId}`,
      };
    }
  }
}
