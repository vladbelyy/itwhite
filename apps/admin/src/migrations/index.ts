import * as migration_20260825_204108_initial_admin_schema from './20260825_204108_initial_admin_schema';
import * as migration_20260826_052415_durable_lead_outbox from './20260826_052415_durable_lead_outbox';

export const migrations = [
  {
    up: migration_20260825_204108_initial_admin_schema.up,
    down: migration_20260825_204108_initial_admin_schema.down,
    name: '20260825_204108_initial_admin_schema',
  },
  {
    up: migration_20260826_052415_durable_lead_outbox.up,
    down: migration_20260826_052415_durable_lead_outbox.down,
    name: '20260826_052415_durable_lead_outbox'
  },
];
