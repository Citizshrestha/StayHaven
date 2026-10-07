import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import healthRoutes from '../routes/healthRoutes.js';
test('public probes stay available while diagnostic details require authentication', async () => {
 const app=express(); app.use('/health',healthRoutes);
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try {
  for(const path of ['/health/detailed','/health/security']) {
   const response=await fetch(base+path); assert.equal(response.status,401);
   assert.equal((await response.json()).success,false);
  }
  assert.equal((await fetch(base+'/health/live')).status,200);
  assert.equal((await fetch(base+'/health/ready')).status,503);
 } finally { await new Promise(resolve=>server.close(resolve)); }
});
