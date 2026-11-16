// READ-ONLY: sample rows to check the dirty-flag invariant (synced_at vs updated_at).
import { createMysqlScriptClient } from './mysql-client.mjs';

const admin = createMysqlScriptClient();

const { data, error } = await admin
  .from('ground_handling_irregularity_report')
  .select('sheet_id, status, updated_at, synced_at')
  .order('updated_at', { ascending: false })
  .limit(10);

if (error) throw error;
let dirtyCount = 0;
for (const row of data) {
  const dirty = !row.synced_at || (row.updated_at && new Date(row.updated_at) > new Date(row.synced_at));
  if (dirty) dirtyCount++;
  console.log(
    `${row.sheet_id} status=${row.status} updated=${row.updated_at} synced=${row.synced_at} dirty=${dirty}`
  );
}
console.log(`\nMost-recently-updated 10 rows: ${dirtyCount} dirty`);
