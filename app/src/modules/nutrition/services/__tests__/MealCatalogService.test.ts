import { getBff } from '@/shared/bff';
import { loadMealRecipeCatalog } from '../MealCatalogService';

jest.mock('@/shared/bff', () => ({
  getBff: jest.fn(),
  bffUrl: (path: string) => `https://app.test${path}`,
}));
const recipes = require('../../../../../../web/src/modules/nutrition/services/recipes/catalog.json');
const manifest = require('../../../../../../web/src/modules/nutrition/services/recipes/mediaManifest.json');

it('consulta catálogo genérico sem enviar refeição ou alimentos e resolve URLs relativas', async () => {
  jest.mocked(getBff).mockResolvedValue({
    version: 1,
    recipes,
    images: manifest.assets.map((asset: { path: string }) => ({
      ...asset,
      url: `/${asset.path}`,
    })),
  });
  const catalog = await loadMealRecipeCatalog('token');
  expect(getBff).toHaveBeenCalledWith('/api/nutrition/recipes', { token: 'token' });
  expect(catalog.recipes).toHaveLength(16);
  expect(catalog.images[0].url).toMatch(/^https:\/\/app.test\/meal-images\//);
});
