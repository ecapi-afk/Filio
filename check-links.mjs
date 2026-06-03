import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Get all clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name');
    
  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    return;
  }
  
  // Get all active short links
  const { data: links, error: linksError } = await supabase
    .from('short_links')
    .select('client_id, short_code, is_active, expires_at')
    .eq('is_active', true);
    
  if (linksError) {
    console.error('Error fetching links:', linksError);
    return;
  }
  
  console.log(`Total clients: ${clients.length}`);
  console.log(`Total active links: ${links.length}`);
  
  const clientMap = new Map();
  clients.forEach(c => clientMap.set(c.id, c.name));
  
  const linesWithLink = new Set(links.map(l => l.client_id));
  
  const missingLinks = clients.filter(c => !linesWithLink.has(c.id));
  
  if (missingLinks.length > 0) {
    console.log(`\nFound ${missingLinks.length} clients WITHOUT an active short link:`);
    missingLinks.forEach(c => console.log(`- ${c.name} (${c.id})`));
  } else {
    console.log('\nAll clients have at least one active short link. ✅');
  }
}

check();
