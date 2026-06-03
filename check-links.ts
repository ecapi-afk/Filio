import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: clients, error: clientsError } = await supabase.from('clients').select('id, name');
  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    return;
  }
  const { data: links, error: linksError } = await supabase.from('short_links').select('client_id, is_active').eq('is_active', true);
  if (linksError) {
    console.error('Error fetching links:', linksError);
    return;
  }
  
  console.log(`Total clients: ${clients.length}`);
  console.log(`Total active links: ${links.length}`);
  
  const linesWithLink = new Set(links.map(l => l.client_id));
  const missingLinks = clients.filter(c => !linesWithLink.has(c.id));
  
  if (missingLinks.length > 0) {
    console.log(`Found ${missingLinks.length} missing links:`);
    missingLinks.forEach(c => console.log(`- ${c.name} (${c.id})`));
  } else {
    console.log('All configured!');
  }
}
check();
