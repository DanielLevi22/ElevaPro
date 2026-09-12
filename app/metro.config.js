const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

// Explicitly set the project root to ensure correct resolution regardless of execution context
config.projectRoot = __dirname;

// Watch the shared package so Metro picks up changes
const sharedPackagePath = path.resolve(__dirname, '../shared');
config.watchFolders = [...(config.watchFolders ?? []), sharedPackagePath];

// Add support for GLB/GLTF 3D model files
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg');

// Polyfill Node built-ins for packages like react-native-svg that import 'buffer'
// Also map @elevapro/* workspace packages that Metro can't resolve via tsconfig aliases
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
  '@elevapro/shared': path.resolve(__dirname, '../shared/src'),
};

// Normalize path to use forward slashes for Windows compatibility
const inputPath = path.resolve(__dirname, './src/global.css').replace(/\\/g, '/');

let finalConfig = config;
try {
  finalConfig = withNativeWind(config, {
    input: inputPath,
    /**
     * Sem isto o NativeWind **inlina** `rem` em tempo de build, com base 14, e
     * `rem.set()` em runtime não muda nada. Foi assim que a primeira tentativa
     * de ajustar a escala ao aparelho saiu pela culatra: a escala de texto está
     * declarada em `rem` sobre base 16, e inlinada a 14 ela ficou 12% MENOR.
     *
     * Com `false`, `rem` é resolvido em runtime a partir de um observável. Aí
     * `ajustarEscalaDeTexto()` move texto **e** espaçamento de uma vez — a
     * escala de espaço do Tailwind já é em `rem` (`p-4` = 1rem), e o preset do
     * NativeWind não a sobrescreve.
     *
     * O custo é o que a documentação chama de performance do inline: cada
     * valor passa por uma leitura de observável em vez de vir como número. É o
     * preço documentado de escala dinâmica, e é o mecanismo que o próprio
     * NativeWind oferece para isso.
     */
    inlineRem: false,
  });
  console.log('✅ NativeWind configuration applied successfully.');
} catch (error) {
  console.error('❌ Error applying withNativeWind:', error);
  // Keep the try-catch to allow app to launch even if style config fails
}

module.exports = finalConfig;
