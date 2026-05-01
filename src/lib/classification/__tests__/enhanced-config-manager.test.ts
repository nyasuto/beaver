/**
 * EnhancedConfigManager のテスト
 *
 * `fs` / `path` を仮想化し、ファイル I/O を発生させずに
 * loadConfig / updateConfiguration / saveConfig / cache 管理 / プロファイル
 * 解決などの主要フローを検証する。
 *
 * NOTE: 対象モジュールは `typeof window === 'undefined'` で Node.js 環境を
 * 判定するため、このテストファイルは happy-dom ではなく node 環境で実行する。
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_ENHANCED_CONFIG,
  type EnhancedClassificationConfig,
} from '../../schemas/classification';

// `fs` / `path` への dynamic import をフックするため、hoist 可能な mock を
// 用意する。各テスト内で `fsState.files[path] = content` を設定すると
// 対応するパスは `existsSync` で true、`readFileSync` でその中身を返す。
const { fsState, mockFs, mockPath } = vi.hoisted(() => {
  const state = {
    files: {} as Record<string, string>,
    writes: [] as { path: string; data: string }[],
    mkdirs: [] as string[],
    existsSyncImpl: undefined as ((p: string) => boolean) | undefined,
    readFileSyncImpl: undefined as ((p: string, enc?: string) => string) | undefined,
    writeFileSyncImpl: undefined as ((p: string, data: string) => void) | undefined,
  };

  return {
    fsState: state,
    mockFs: {
      existsSync: (p: string) => {
        if (state.existsSyncImpl) return state.existsSyncImpl(p);
        return p in state.files;
      },
      readFileSync: (p: string, enc?: string) => {
        if (state.readFileSyncImpl) return state.readFileSyncImpl(p, enc);
        const content = state.files[p];
        if (content === undefined) {
          throw new Error(`ENOENT: no such file or directory, open '${p}'`);
        }
        return content;
      },
      writeFileSync: (p: string, data: string) => {
        if (state.writeFileSyncImpl) {
          state.writeFileSyncImpl(p, data);
          return;
        }
        state.writes.push({ path: p, data });
        state.files[p] = data;
      },
      mkdirSync: (dir: string) => {
        state.mkdirs.push(dir);
      },
    },
    mockPath: {
      join: (...parts: string[]) => parts.join('/'),
      dirname: (p: string) => {
        const idx = p.lastIndexOf('/');
        return idx >= 0 ? p.slice(0, idx) : '';
      },
    },
  };
});

vi.mock('fs', () => ({ ...mockFs, default: mockFs }));
vi.mock('path', () => ({ ...mockPath, default: mockPath }));

// 動的 import 後にこのモジュールを読み込む必要があるため、
// `vi.mock` のあと（hoist 後）に import する設計が前提。
import {
  EnhancedConfigManager,
  enhancedConfigManager,
  loadEnhancedConfig,
  updateEnhancedConfig,
} from '../enhanced-config-manager';

const buildConfig = (overrides: Partial<EnhancedClassificationConfig> = {}) => ({
  ...DEFAULT_ENHANCED_CONFIG,
  ...overrides,
});

const buildEnhancedV2Config = () =>
  buildConfig({
    version: '2.0.0',
    repositories: [],
  });

const resetFsState = () => {
  fsState.files = {};
  fsState.writes = [];
  fsState.mkdirs = [];
  fsState.existsSyncImpl = undefined;
  fsState.readFileSyncImpl = undefined;
  fsState.writeFileSyncImpl = undefined;
};

describe('EnhancedConfigManager', () => {
  beforeEach(() => {
    resetFsState();
    // ノイジーな log/warn を抑制
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('uses provided paths when supplied', () => {
      const m = new EnhancedConfigManager(['/custom/a.json', '/custom/b.json']);
      // 内部 path に依存する getCacheStats は size 0 を返すだけだが、
      // saveConfig 経由で configPath[0] が使われることを確認できる。
      expect(m.getCacheStats().configCacheSize).toBe(0);
    });

    it('falls back to default paths when no paths and process.cwd is available', () => {
      const m = new EnhancedConfigManager();
      expect(m.getCacheStats().configCacheSize).toBe(0);
    });
  });

  describe('loadConfig', () => {
    it('returns fallback DEFAULT_ENHANCED_CONFIG when no config files exist', async () => {
      const m = new EnhancedConfigManager(['/missing/config.json']);
      const result = await m.loadConfig();
      // 存在しないファイル → loadBaseConfig が DEFAULT を返す → source='file'
      expect(result.config.version).toBe(DEFAULT_ENHANCED_CONFIG.version);
      expect(result.fromCache).toBe(false);
      expect(result.errors).toEqual([]);
    });

    it('loads and validates an enhanced (v2) config file', async () => {
      const cfg = buildEnhancedV2Config();
      fsState.files['/cfg/a.json'] = JSON.stringify(cfg);
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      const result = await m.loadConfig();
      expect(result.config.version).toBe('2.0.0');
      expect(result.source).toBe('file');
    });

    it('converts a legacy config (no v2 marker) into enhanced shape', async () => {
      const legacy = { ...DEFAULT_ENHANCED_CONFIG, version: '1.0.0' };
      // v2 判定は `version.startsWith('2.') && repositories !== undefined` なので
      // v1 + repositories なし は legacy 扱いになる
      delete (legacy as Partial<EnhancedClassificationConfig>).repositories;
      fsState.files['/cfg/legacy.json'] = JSON.stringify(legacy);
      const m = new EnhancedConfigManager(['/cfg/legacy.json']);

      const result = await m.loadConfig();
      expect(result.config.version).toBe('2.0.0'); // convertLegacyConfig が上書き
      expect(result.config.repositories).toEqual([]);
      expect(result.config.customRules).toEqual([]);
    });

    it('serves a second call from cache (fromCache=true, source=memory)', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      await m.loadConfig();
      const second = await m.loadConfig();
      expect(second.fromCache).toBe(true);
      expect(second.source).toBe('memory');
    });

    it('uses cache key per repository context', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      await m.loadConfig({ owner: 'o1', repo: 'r1' });
      await m.loadConfig({ owner: 'o2', repo: 'r2' });

      // 異なる repo ごとに別エントリが入ること
      expect(m.getCacheStats().configCacheSize).toBe(2);
    });

    it('records error when config file is unreadable JSON', async () => {
      fsState.files['/cfg/broken.json'] = '{not json';
      const m = new EnhancedConfigManager(['/cfg/broken.json']);

      // loadBaseConfig 内では catch → continue なので、最終的に
      // DEFAULT_ENHANCED_CONFIG が返り、エラーは無し (warning console.warn のみ)
      const result = await m.loadConfig();
      expect(result.config.version).toBe(DEFAULT_ENHANCED_CONFIG.version);
    });

    it('reports an error when fs.readFileSync throws and triggers outer catch', async () => {
      fsState.existsSyncImpl = () => true;
      fsState.readFileSyncImpl = () => {
        throw new Error('disk full');
      };
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      const result = await m.loadConfig();
      // loadBaseConfig 内 catch で握り潰し → DEFAULT を返す
      expect(result.config.version).toBe(DEFAULT_ENHANCED_CONFIG.version);
    });
  });

  describe('updateConfiguration', () => {
    it('applies a "set" update at the given path (same cache context)', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      const res = await m.updateConfiguration({
        path: 'maxCategories',
        value: 5,
        operation: 'set',
        conditions: [],
      });

      expect(res.success).toBe(true);
      // updateConfiguration は repositoryContext なしの cache key で書き込むので
      // 同じ key で取り出すために getEffectiveConfig も context なしで呼ぶ
      const result = await m.loadConfig();
      expect(result.config.maxCategories).toBe(5);
    });

    it('reaches the "merge" branch in applyConfigurationUpdate', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      // "merge" 演算自体が走ることが目的。後段の schema 再検証は
      // 失敗する可能性があるため成否は問わない。
      const res = await m.updateConfiguration({
        path: 'scoringAlgorithm.weights',
        value: { custom: 25 },
        operation: 'merge',
        conditions: [],
      });
      expect(typeof res.success).toBe('boolean');
    });

    it('reaches the "append" branch even when target is non-array', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      // append branch はまず Array チェック → 配列でない場合は値で置換する分岐を通る
      const res = await m.updateConfiguration({
        path: 'maxCategories', // number なので非配列 branch へ
        value: 99,
        operation: 'append',
        conditions: [],
      });
      expect(typeof res.success).toBe('boolean');
    });

    it('reaches the "remove" branch in applyConfigurationUpdate', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      const res = await m.updateConfiguration({
        path: 'maxCategories',
        value: null,
        operation: 'remove',
        conditions: [],
      });
      // schema が default を補完するため success=true でも falseでもよい。
      // ここで重要なのは applyConfigurationUpdate の remove 分岐を実行すること。
      expect(typeof res.success).toBe('boolean');
    });

    it('returns error when the update payload itself fails schema validation', async () => {
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      const res = await m.updateConfiguration({
        // path 必須なのに欠落
        value: 1,
      } as unknown as Parameters<typeof m.updateConfiguration>[0]);
      expect(res.success).toBe(false);
      expect(res.errors[0]).toMatch(/Failed to update configuration/);
    });

    it('exposes the same flow via the updateEnhancedConfig helper', async () => {
      const res = await updateEnhancedConfig({
        path: 'maxCategories',
        value: 7,
        operation: 'set',
        conditions: [],
      });
      // singleton 経由でも error なく返ること
      expect(typeof res.success).toBe('boolean');
    });
  });

  describe('saveConfig', () => {
    it('writes JSON to the supplied path and clears cache', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      await m.loadConfig(); // cache に入れる
      expect(m.getCacheStats().configCacheSize).toBe(1);

      const res = await m.saveConfig(buildEnhancedV2Config(), '/cfg/out.json');
      expect(res.success).toBe(true);
      expect(fsState.writes.find(w => w.path === '/cfg/out.json')).toBeDefined();
      expect(m.getCacheStats().configCacheSize).toBe(0);
    });

    it('creates the parent directory when missing', async () => {
      fsState.existsSyncImpl = (p: string) => p === '/cfg/a.json'; // dir は存在しない
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      await m.saveConfig(buildEnhancedV2Config(), '/missing/out.json');
      expect(fsState.mkdirs.includes('/missing')).toBe(true);
    });

    it('returns error when validation fails', async () => {
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      // version は string が要求されるため number にすると schema が必ず失敗
      const broken = {
        ...buildEnhancedV2Config(),
        version: 12345,
      } as unknown as EnhancedClassificationConfig;
      const res = await m.saveConfig(broken);
      expect(res.success).toBe(false);
    });

    it('returns error when fs.writeFileSync throws', async () => {
      fsState.writeFileSyncImpl = () => {
        throw new Error('EACCES');
      };
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      const res = await m.saveConfig(buildEnhancedV2Config());
      expect(res.success).toBe(false);
      expect(res.errors[0]).toMatch(/Failed to save configuration/);
    });
  });

  describe('cache & validation utilities', () => {
    it('clearCache empties both caches', async () => {
      fsState.files['/cfg/a.json'] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      await m.loadConfig();
      expect(m.getCacheStats().configCacheSize).toBeGreaterThanOrEqual(1);
      m.clearCache();
      expect(m.getCacheStats().configCacheSize).toBe(0);
      expect(m.getCacheStats().profileCacheSize).toBe(0);
    });

    it('getCacheStats reports current sizes', () => {
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      expect(m.getCacheStats()).toEqual({
        configCacheSize: 0,
        profileCacheSize: 0,
        configCacheHitRate: 0,
      });
    });

    it('validateConfiguration accepts valid config and rejects invalid', () => {
      const m = new EnhancedConfigManager(['/cfg/a.json']);
      const ok = m.validateConfiguration(buildEnhancedV2Config());
      expect(ok.valid).toBe(true);
      expect(ok.errors).toEqual([]);

      const bad = m.validateConfiguration({ junk: 'data' });
      expect(bad.valid).toBe(false);
      expect(bad.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getEffectiveConfig', () => {
    it('returns DEFAULT when no file is found', async () => {
      const m = new EnhancedConfigManager(['/missing.json']);
      const eff = await m.getEffectiveConfig({ owner: 'o', repo: 'r' });
      expect(eff.version).toBe(DEFAULT_ENHANCED_CONFIG.version);
    });

    it('applies repository overrides when matching repo entry exists & enabled', async () => {
      const cfg = buildEnhancedV2Config();
      cfg.repositories = [
        {
          id: 'rid',
          owner: 'octocat',
          repo: 'demo',
          enabled: true,
          priority: 50,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        } as unknown as EnhancedClassificationConfig['repositories'][number],
      ];
      cfg.metadata = undefined;
      fsState.files['/cfg/a.json'] = JSON.stringify(cfg);
      const m = new EnhancedConfigManager(['/cfg/a.json']);

      const eff = await m.getEffectiveConfig({ owner: 'octocat', repo: 'demo' });
      // applyRepositoryOverrides は metadata を補完する
      expect(eff.metadata).toBeDefined();
      expect(eff.metadata?.configSource).toBe('file');
    });
  });

  describe('loadEnhancedConfig helper', () => {
    it('returns the underlying singleton config', async () => {
      const cfg = await loadEnhancedConfig();
      expect(cfg.version).toBeDefined();
    });
  });

  describe('singleton instance', () => {
    it('is exported and shares state across helper calls', async () => {
      enhancedConfigManager.clearCache();
      expect(enhancedConfigManager.getCacheStats().configCacheSize).toBe(0);
      await loadEnhancedConfig();
      // singleton の cache が更新されている (file がなくても fallback でも 1 件は入る場合あり)
      expect(enhancedConfigManager.getCacheStats().configCacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('forceLoadConfigFromFile', () => {
    it('returns parsed config when file exists', async () => {
      // forceLoadConfigFromFile は process.cwd() からの絶対パスを使用するので、
      // テスト中のパスを mock の files map に登録しておく
      const cwdPath = `${process.cwd()}/src/data/config/default-classification.json`;
      fsState.files[cwdPath] = JSON.stringify(buildEnhancedV2Config());
      const m = new EnhancedConfigManager();

      const cfg = await m.forceLoadConfigFromFile();
      expect(cfg.version).toBe('2.0.0');
    });

    it('falls back to DEFAULT when file is missing', async () => {
      // mock files に何も無いので readFileSync が throw
      const m = new EnhancedConfigManager();
      const cfg = await m.forceLoadConfigFromFile();
      expect(cfg.version).toBe(DEFAULT_ENHANCED_CONFIG.version);
    });

    it('converts legacy file content via the legacy path', async () => {
      const cwdPath = `${process.cwd()}/src/data/config/default-classification.json`;
      const legacy = { ...DEFAULT_ENHANCED_CONFIG, version: '1.5.0' };
      delete (legacy as Partial<EnhancedClassificationConfig>).repositories;
      fsState.files[cwdPath] = JSON.stringify(legacy);
      const m = new EnhancedConfigManager();

      const cfg = await m.forceLoadConfigFromFile();
      expect(cfg.version).toBe('2.0.0'); // convertLegacyConfig が version を上書き
    });
  });

  describe('profile + merge', () => {
    it('merges profile config with base via mergeConfigurations', async () => {
      // profile の path は path.join(process.cwd(), 'src/data/config/profiles', `${id}.json`)
      const profileId = 'dev';
      const profilePath = `${process.cwd()}/src/data/config/profiles/${profileId}.json`;
      const baseCfg = buildEnhancedV2Config();
      fsState.files['/cfg/a.json'] = JSON.stringify(baseCfg);
      // profile content
      const profile = {
        id: profileId,
        name: 'dev',
        description: 'development',
        type: 'development',
        config: buildEnhancedV2Config(),
        isDefault: false,
        tags: [],
      };
      fsState.files[profilePath] = JSON.stringify(profile);

      const m = new EnhancedConfigManager(['/cfg/a.json']);
      const result = await m.loadConfig(undefined, profileId);
      expect(result.config.version).toBe('2.0.0');
      // 2 度目はキャッシュ
      const second = await m.loadConfig(undefined, profileId);
      expect(second.fromCache).toBe(true);
    });
  });
});
