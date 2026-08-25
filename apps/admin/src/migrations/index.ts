import * as migration_20260825_204108_initial_admin_schema from './20260825_204108_initial_admin_schema';

export const migrations = [
  {
    up: migration_20260825_204108_initial_admin_schema.up,
    down: migration_20260825_204108_initial_admin_schema.down,
    name: '20260825_204108_initial_admin_schema'
  },
];
