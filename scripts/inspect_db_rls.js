const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("==========================================");
  console.log("🔍 Querying Database RLS Status and Policies...");
  console.log("==========================================");

  // 1. Get RLS Status
  const { data: rlsStatus, error: rlsError } = await supabase.rpc('get_tables_rls_status');
  if (rlsError) {
    console.log("❌ Error fetching RLS status (RPC 'get_tables_rls_status' not found or failed):", rlsError.message);
  } else {
    console.log("\n📊 Table RLS Status:");
    console.table(rlsStatus);
  }

  // 2. Get Policies
  const { data: policies, error: polError } = await supabase.rpc('get_active_policies');
  if (polError) {
    console.log("❌ Error fetching policies (RPC 'get_active_policies' not found or failed):", polError.message);
  } else {
    console.log("\n📜 Active Policies:");
    console.table(policies.map(p => ({
      table: p.tablename,
      name: p.policyname,
      command: p.cmd,
      roles: p.roles.join(', '),
      using: p.qual,
      with_check: p.with_check
    })));
  }
  console.log("==========================================");
}

run();
