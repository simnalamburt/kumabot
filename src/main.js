// @flow
import IRC from 'slate-irc'
import tls from 'tls'
// $FlowIssue: Use a local installed package
import Kakao from 'kakao'
import { sKey, duuid, table } from '../config.json'
import { invert } from './utils.js'


//
// Establish Kakaotalk & IRC connection
//
let irc, kakao;
console.log('\x1b[36mStarting hyeonbot ...\x1b[0m');
{
  const option = {
    host: 'irc.uriirc.org',
    port: 16664,
    rejectUnauthorized: false
  };

  irc = IRC(tls.connect(option));
  irc.nick('\ufeff');
  irc.user('hyeonbot', '김지현의 카카오톡-IRC 연결봇');
  Object.keys(table).forEach(channel => irc.join(channel));
}
{
  kakao = new Kakao(sKey, duuid);
  kakao.login().then(({ host, port }) => {
    console.log(`Connected with \x1b[32m${host}:${port}\x1b[0m`);
  });
}


//
// IO
//
irc.on('message', ({ from: name, to: channel, message }) => {
  if (channel in table) {
    const sanitized = name.split('').join('\ufeff');
    kakao.write(table[channel], `${sanitized}» ${message}`);
  }
});

const kakao_irc = Object.freeze(invert(table));
kakao.on('message', ({ chat_id, user: { name }, message, type, attachment }) => {
  // Debug purpose
  if (message.includes('김젼봇')) {
    console.log(`<@\x1b[33m${name}\x1b[0m> ${message} \x1b[38;5;239m... ${chat_id}\x1b[0m`);
  }

  if (chat_id in kakao_irc) {
    const sanitized = name.split('').join('\x0f');

    let lines: Array<string>;
    switch (type) {
    case 1: // Text
      lines = message.replace(/\r/g, '').split('\n');
      break;
    case 2: // Photo
      lines = [`(사진) ${attachment.url}`];
      break;
    default: // Unknown type
      lines = [];
    }

    lines.forEach(line => {
      irc.send(kakao_irc[chat_id], `<${sanitized}> ${line}`);
    });
  }
});


//
// Handle ^C gracefully
//
process.on('SIGINT', _ => {
  const message = 'See you next time!';
  irc.quit(message);
  kakao.close();
  console.log(`\n\x1b[36m${message}\x1b[0m`);
  process.exit();
});
