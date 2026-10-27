import * as migration_20261027_134934_initial from './20261027_134934_initial';
import * as migration_20261027_151221_products from './20261027_151221_products';
import * as migration_20261027_170450_frameworks from './20261027_170450_frameworks';
import * as migration_20261027_175148_blog from './20261027_175148_blog';

export const migrations = [
  {
    up: migration_20261027_134934_initial.up,
    down: migration_20261027_134934_initial.down,
    name: '20261027_134934_initial',
  },
  {
    up: migration_20261027_151221_products.up,
    down: migration_20261027_151221_products.down,
    name: '20261027_151221_products',
  },
  {
    up: migration_20261027_170450_frameworks.up,
    down: migration_20261027_170450_frameworks.down,
    name: '20261027_170450_frameworks',
  },
  {
    up: migration_20261027_175148_blog.up,
    down: migration_20261027_175148_blog.down,
    name: '20261027_175148_blog'
  },
];
