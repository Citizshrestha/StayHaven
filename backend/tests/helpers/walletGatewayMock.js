import assert from 'node:assert/strict';

// All fetches are intercepted; unknown endpoints fail instead of reaching the network.
export function installWalletGatewayMock() {
  const original = global.fetch;
  const calls = [];
  const payments = new Map();
  let sequence = 0;
  const reply = data => new Response(JSON.stringify(data), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
  global.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, body, method: init.method || 'GET' });
    if (url.hostname === 'dev.khalti.com') {
      assert.equal(init.method, 'POST');
      if (url.pathname === '/api/v2/epayment/initiate/') {
        assert.ok(Number.isSafeInteger(body.amount) && body.amount > 0, 'Provider receives integer paisa');
        const pidx = `test-pidx-${++sequence}`;
        payments.set(pidx, {
          pidx, status: 'Completed', total_amount: body.amount,
          transaction_id: `test-transaction-${sequence}`, refunded: false, fee: 0,
        });
        return reply({ pidx, payment_url: `https://test-pay.khalti.com/pay/${pidx}`,
          expires_at: new Date(Date.now() + 1800000).toISOString(), expires_in: 1800 });
      }
      if (url.pathname === '/api/v2/epayment/lookup/') {
        assert.ok(payments.has(body.pidx), 'Lookup must use a previously initiated pidx');
        return reply(payments.get(body.pidx));
      }
    }
    if (url.hostname === 'rc.esewa.com.np' && url.pathname === '/api/epay/transaction/status/') {
      const uuid = url.searchParams.get('transaction_uuid');
      return reply(payments.get(uuid) || {
        status: 'COMPLETE', ref_id: `test-esewa-${uuid}`, transaction_uuid: uuid,
        product_code: 'EPAYTEST', total_amount: Number(url.searchParams.get('total_amount')),
      });
    }
    throw new Error(`Unexpected network request blocked: ${url.origin}${url.pathname}`);
  };
  return {
    calls,
    payments,
    initiationCalls: () => calls.filter(call => call.url.pathname.endsWith('/initiate/')),
    restore() { global.fetch = original; },
  };
}
