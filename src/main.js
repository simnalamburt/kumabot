// @flow
import IRC from 'slate-irc'
import tls from 'tls'
// $FlowIssue: Use a local installed package
import Kakao from 'kakao'
import { sKey, duuid, table, friends } from '../config.json'
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
kakao.on('message', data => {
  const { chat_id, user: { name, id: user_id }, message } = data;

  // Debug purpose
  if (message.includes('김젼봇')) {
    console.log(`<@\x1b[33m${name}\x1b[0m \x1b[38;5;239m${user_id}\x1b[0m> ${message} \x1b[38;5;239m... ${chat_id}\x1b[0m`);
  }

  // PING-PONG protocol
  if (message.includes('이리온') && friends.indexOf(user_id) >= 0) {
    kakao.write(chat_id, '냐옹');
  }

  // Relay
  if (chat_id in kakao_irc) {
    const sanitized = name.split('').join('\x0f');

    let lines: Array<string>;
    switch (data.type) {
      case 1:  lines = message.replace(/\r/g, '').split('\n'); break; // Plain Text
      case 2:  lines = [ `(이미지) ${data.attachment.url}` ]; break; // Image
      case 23: lines = [ daum_search(data.attachment) ]; break; // Search
      default: lines = [];
    }

    lines.forEach(line => irc.send(kakao_irc[chat_id], `<${sanitized}> ${line}`));


  }
});

// 카카오 샾검색 결과를 한줄로 요약해주는 함수
function daum_search(att: Object): string {
  if (att.R.length === 1) {
    const entry = att.R[0];

    // 계산기
    if (att.V === 'simple' && att.Q === '계산기') {
      const result = entry.T.startsWith('=') ? entry.T.slice(1) : entry.T;
      return `${entry.D} = ${result}`;
    }

    // 검색결과가 단일 이미지일경우
    if (att.V === 'image') {
      return `#${att.Q} (이미지) ${entry.I}`;
    }

    // 지도
    if (att.V === 'list' && att.RH && att.RH.HI && att.RH.HI.L && att.RH.HI.TP === 'map') {
      return `#${att.Q} (지도) ${att.RH.HI.L}`;
    }

    // 영화
    if (att.V === 'movie' && entry.T && entry.DE && entry.L) {
      return `#${entry.T} - ${entry.DE} ${entry.L}`;
    }

    // 날씨
    const w = entry.MA;
    if (att.V === 'weather' && w && w.length === 1 && w[0].T && w[0].TE) {
      return `#${att.Q} - ${w[0].TE}°C ${w[0].T} ${att.L}`;
    }

    // 그 외에 검색결과가 하나일경우
    if (att.V === 'list' && entry.D && entry.T && entry.L) {
      const title = entry.T.length > 40 ?
        entry.T.substring(0, 30) + '...' :
        entry.T;

      return `#${att.Q} - ${title} (${entry.D}) ${entry.L}`;
    }
  }

  return `#${att.Q} ${att.L}`;
}


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
