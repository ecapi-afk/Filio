import { getClientById } from './lib/data/clients';

async function test() {
  const c = await getClientById('fcc6d2f0-5c33-4f5b-986a-6ae3a81c8afe');
  console.log("Uploads found:", c?.uploads?.length);
  console.log(c?.uploads);
}
test();
