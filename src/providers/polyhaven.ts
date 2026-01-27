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

const POLYHAVEN_CONFIG: ProviderConfig = {
  name: 'polyhaven',
  displayName: 'Poly Haven',
  baseUrl: 'https://polyhaven.com',
  apiUrl: 'https://api.polyhaven.com',
  userAgent: 'GodotMCP/1.0',
  priority: 1,
  supportedTypes: ['models', 'textures', 'hdris'],
  requiresAuth: false,
  license: 'CC0',
};

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

function mapAssetTypeToApiParam(type: AssetType): string {
  switch (type) {
    case 'models': return 'models';
    case 'textures': return 'textures';
    case 'hdris': return 'hdris';
    default: return 'models';
  }
}

export class PolyHavenProvider implements IAssetProvider {
  readonly config = POLYHAVEN_CONFIG;

  supportsType(type: AssetType): boolean {
    return this.config.supportedTypes.includes(type);
  }

  getAttribution(assetId: string, assetName: string): string {
    return `## ${assetName}\n- Source: [Poly Haven](https://polyhaven.com/a/${assetId})\n- License: CC0 (Public Domain)\n- Downloaded: ${new Date().toISOString()}\n`;
  }

  async search(options: SearchOptions): Promise<AssetSearchResult[]> {
    const { keyword, assetType = 'models', maxResults = 10 } = options;
    const apiType = mapAssetTypeToApiParam(assetType);
    const searchUrl = `${this.config.apiUrl}/assets?t=${apiType}`;

    try {
      const responseText = await httpGet(searchUrl, this.config.userAgent);
      const allAssets = JSON.parse(responseText);
      const keywordLower = keyword.toLowerCase();

      const matches: AssetSearchResult[] = [];

      for (const [assetId, assetData] of Object.entries(allAssets) as [string, any][]) {
        let score = 0;
        
        if (assetId.toLowerCase().includes(keywordLower)) score += 100;
        if (assetData.name?.toLowerCase().includes(keywordLower)) score += 80;
        
        if (assetData.tags) {
          for (const tag of assetData.tags) {
            if (tag.toLowerCase().includes(keywordLower)) score += 50;
          }
        }
        
        if (assetData.categories) {
          for (const cat of assetData.categories) {
            if (cat.toLowerCase().includes(keywordLower)) score += 30;
          }
        }

        if (score > 0) {
          matches.push({
            id: assetId,
            name: assetData.name || assetId,
            provider: this.config.name,
            assetType,
            categories: assetData.categories || [],
            tags: assetData.tags || [],
            license: 'CC0',
            previewUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${assetId}.png`,
            score,
          });
        }
      }

      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
    } catch (error) {
      console.error(`[PolyHaven] Search failed: ${error}`);
      return [];
    }
  }

  async download(options: DownloadOptions): Promise<AssetDownloadResult> {
    const { 
      assetId, 
      projectPath, 
      targetFolder = 'downloaded_assets/polyhaven',
      resolution = '2k',
      format,
    } = options;

    try {
      const fileInfoUrl = `${this.config.apiUrl}/files/${assetId}`;
      const responseText = await httpGet(fileInfoUrl, this.config.userAgent);
      const fileInfo = JSON.parse(responseText);

      let downloadUrl = '';
      let fileExtension = '.glb';
      let detectedType: AssetType = 'models';

      if (fileInfo.gltf) {
        detectedType = 'models';
        const res = fileInfo.gltf[resolution] || fileInfo.gltf[Object.keys(fileInfo.gltf)[0]];
        downloadUrl = res?.gltf?.url || '';
        fileExtension = '.glb';
      } else if (fileInfo.Diffuse) {
        detectedType = 'textures';
        const res = fileInfo.Diffuse[resolution] || fileInfo.Diffuse[Object.keys(fileInfo.Diffuse)[0]];
        downloadUrl = res?.png?.url || '';
        fileExtension = '.png';
      } else if (fileInfo.hdri) {
        detectedType = 'hdris';
        const res = fileInfo.hdri[resolution] || fileInfo.hdri[Object.keys(fileInfo.hdri)[0]];
        downloadUrl = res?.hdr?.url || '';
        fileExtension = '.hdr';
      }

      if (!downloadUrl) {
        throw new Error(`No download URL found for asset: ${assetId}`);
      }

      const targetDir = join(projectPath, targetFolder);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const fileName = `${assetId}${fileExtension}`;
      const filePath = join(targetDir, fileName);

      await downloadFile(downloadUrl, filePath, this.config.userAgent);

      const creditsPath = join(targetDir, 'CREDITS.md');
      const attribution = this.getAttribution(assetId, assetId);
      
      if (existsSync(creditsPath)) {
        appendFileSync(creditsPath, '\n' + attribution);
      } else {
        writeFileSync(creditsPath, `# Asset Credits\n\nAssets downloaded from Poly Haven (CC0 License)\n\n${attribution}`);
      }

      return {
        success: true,
        assetId,
        provider: this.config.name,
        localPath: `${targetFolder}/${fileName}`,
        fileName,
        license: 'CC0',
        attribution,
        sourceUrl: `https://polyhaven.com/a/${assetId}`,
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
        sourceUrl: `https://polyhaven.com/a/${assetId}`,
      };
    }
  }
}
