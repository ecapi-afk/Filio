import { getClients } from './lib/data/clients';

async function main() {
  const c = await getClients();
  console.log(JSON.stringify(c, null, 2));
}

main().catch(console.error);
