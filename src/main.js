// @flow
import IRC from 'slate-irc'
import tls from 'tls'
// $FlowIssue: Use a local installed package
import Kakao from 'kakao'
import { sKey, duuid } from '../config.json'

console.log('\x1b[36mStarting hyeonbot ...\x1b[0m');


//
// Establish Kakaotalk & IRC connection
//
let irc, kakao;
{
  const stream = tls.connect({
    host: 'irc.uriirc.org', port: 16664,
    rejectUnauthorized: false,
  });

  irc = IRC(stream);
  irc.nick('\u0002\u0002');
  irc.user('hyeonbot', '김지현의 카카오톡-IRC 연결봇');
  irc.join('#botworld');
}
{
  kakao = new Kakao(sKey, duuid);
  kakao.login().then(server => {
    console.log(`\x1b[32mSigned in to Kakaltalk successfully\x1b[0m - ${server.host}:${server.port}`)
  });
}

// Handle ^C gracefully
process.on('SIGINT', () => {
  const message = 'See you next time!';
  irc.quit(message);
  kakao.close();
  console.log(`\n\x1b[36m${message}\x1b[0m`);
  process.exit();
});

// IO
irc.on('message', ({ from: user, to: channel, message }) => {
  console.log(`${channel} <@${user}> ${message}`);

  if (message === '이리온') { irc.send(channel, '냐옹'); }
});

kakao.on('message', ({ user: { id, name }, chat_id, message, time }) => {
  console.log(`[${chat_id}] ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()} ${name}(${id}) ${message}`);

  if (message === '이리온') { kakao.write(chat_id, '냐옹'); }
});
