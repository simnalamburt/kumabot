#!/usr/bin/env node
const irc = require('slate-irc');
const tls = require('tls');

// Establish connection
const client = (() => {
  const stream = tls.connect({
    host: 'irc.uriirc.org',
    port: 16664,
    rejectUnauthorized: false,
  });

  const client = irc(stream);
  client.nick('\u0002\u0002');
  client.user('hyeonbot', '김지현의 카카오톡-IRC 연결봇');
  client.join('#botworld');
  return client;
})();

// Handle ^C gracefully
process.on('SIGINT', () => {
  const message = 'See you next time!';
  client.quit(message);
  console.log(`\n\n\x1b[36m${message}\x1b[0m`);
});

// IO
client.on('message', (msg) => {
  console.log(msg);
});
