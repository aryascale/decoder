import handler from './api/client-logs';

async function test() {
  const req = {
    httpMethod: 'POST',
    body: JSON.stringify({
      action: 'TNC_AGREED',
      detail: 'Peserta telah menyetujui',
      metadata: { userEmail: 'test@example.com', eventId: '123' }
    })
  };
  console.log('Sending request to handler...');
  const res = await handler(req);
  console.log('Response:', res);
}
test();
