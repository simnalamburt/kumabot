// @flow
import irc from 'slate-irc'
import tls from 'tls'

const log = (msg) => console.log(`\x1b[36m${msg}\x1b[0m`);
log('Starting hyeonbot ...');

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
  log('\n\n' + message);
});

// IO
client.on('message', ({ from: user, to: channel, message }) => {
  console.log(`${channel} <@${user}> ${message}`);
});
