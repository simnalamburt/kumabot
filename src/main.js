// @flow
import IRC from 'qbirc'
import tls from 'tls'
import UUID from 'uuid-js'
import { client as WebSocketClient } from 'websocket'
// $FlowIssue: Use a local installed package
import Kakao from 'kakao'
import { sKey, duuid, table, friends } from '../config.json'
import { invert } from './utils.js'


//
// Establish Kakaotalk & IRC connection
//
let irc, kakao;
console.log('\x1b[36mStarting kumabot ...\x1b[0m');
{
  const option = {
    host: 'irc.uriirc.org',
    port: 16664,
    rejectUnauthorized: false
  };

  irc = IRC(tls.connect(option));
  irc.nick('\ufeff');
  irc.user('kumabot', 'ㅇㅅㅇ');
  Object.keys(table).forEach(channel => irc.join(channel));
}
{
  kakao = new Kakao(sKey, duuid);
  kakao.login().then(({ host, port }) => {
    console.log(`Connected with kakaotalk server \x1b[38;5;239m${host}:${port}\x1b[0m`);
  });
}


//
// IO
//
irc.on('message', ({ from: name, to: channel, message }) => {
  if (channel in table) {
    // 키워드 알림 방지
    name = name.split('').join('\ufeff');
    // IRC 메세지 스타일링에 쓰이는 글자들 카톡에 보낼때엔 삭제하기
    message = message.replace(/[\x02\x1D\x1F\x16\x0F]|\x03\d{0,2}(?:,\d{0,2})?/g, '');

    kakao.write(table[channel], `${name}» ${message}`);
  }
});

const kakao_irc = Object.freeze(invert(table));
kakao.on('message', data => {
  const { chat_id, user: { name, id: user_id }, message } = data;

  // Debug purpose
  if (message.includes('쿠마봇')) {
    console.log(`<@\x1b[33m${name}\x1b[0m \x1b[38;5;239m${user_id}\x1b[0m> ${message} \x1b[38;5;239m... ${chat_id}\x1b[0m`);
  }

  // PING-PONG protocol
  if (message.includes('이리온') && friends.indexOf(user_id) >= 0) {
    kakao.write(chat_id, '냐옹');
  }

  // Relay
  if (chat_id in kakao_irc) {
    const sanitized = name.split('').join('\x0f');
    parse_kakao(data).forEach(line => irc.send(kakao_irc[chat_id], `<${sanitized}> ${line}`));
  }
});

// 카카오톡으로부터 전달받은 데이터를 적당히 출력할 수 있는 string의 리스트로
// 바꿔주는 함수
function parse_kakao(data: Object): Array<string> {
  let lines: Array<string>;
  switch (data.type) {
    case 1:  lines = data.message.replace(/\r/g, '').split('\n'); break; // Plain Text
    case 2:  lines = [ `(이미지) ${data.attachment.url}` ]; break; // Image
    case 23: lines = [ daum_search(data.attachment) ]; break; // Search
    default: lines = [];
  }
  return lines;
}

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
