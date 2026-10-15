import { LanParser, type LanToken } from '@/core/codec/lanParser';
import { formatDth, formatDthBytes, formatRqh, parseLanMessage, VER_COMMAND } from '@/core/codec/TextCodec';
import { addr } from '@/core/codec/value';

const ACK = Symbol('ACK');

function run(chunks: string[]): (string | symbol)[] {
  const p = new LanParser();
  const out: (string | symbol)[] = [];
  for (const c of chunks) {
    for (const t of p.feed(c) as LanToken[]) out.push(t.kind === 'ack' ? ACK : t.text);
  }
  return out;
}

describe('lanParser（SPEC §3-4 必須ケース）', () => {
  test.each<[string[], (string | symbol)[]]>([
    [['Enter pass', 'word:'], ['Enter password:']],
    [['Welcome to V', '-160HD.'], ['Welcome to V-160HD.']],
    [['DTH:002100,01;Enter password:'], ['DTH:002100,01', 'Enter password:']],
    [['DTH:002100,01;DTH:002101,02;Welcome to V-160HD.'], ['DTH:002100,01', 'DTH:002101,02', 'Welcome to V-160HD.']],
    [['VER:V-160HD,1.04\nEnter password:'], ['VER:V-160HD,1.04', 'Enter password:']],
    [['\x06DTH:0C0000,0102;'], [ACK, 'DTH:0C0000,0102']],
    [['\x02ACK;\x02DTH:001500,29;'], ['ACK', 'DTH:001500,29']],
    [['Welcome to V-', '80HD.'], ['Welcome to V-80HD.']],
  ])('%j → %j', (chunks, expected) => {
    expect(run(chunks)).toEqual(expected);
  });

  test('未完の末尾は持ち越す', () => {
    const p = new LanParser();
    expect(p.feed('DTH:0021')).toEqual([]);
    expect(p.feed('00,22;DTH:')).toEqual([{ kind: 'text', text: 'DTH:002100,22' }]);
    expect(p.pending).toBe('DTH:');
  });

  test('CR・xon/xoff・Telnet IAC を除去', () => {
    expect(run(['\xff\xfb\x01DTH:002100,01;\r\n\x11\x13'])).toEqual(['DTH:002100,01']);
  });

  test('Welcome の後に区切り付きメッセージが続く', () => {
    expect(run(['Welcome to V-160HD.VER:V-160HD,3.60\n'])).toEqual(['Welcome to V-160HD.', 'VER:V-160HD,3.60']);
  });
});

describe('TextCodec', () => {
  test('DTH / RQH / VER の組立て', () => {
    expect(formatDth(addr(0x00, 0x21, 0x00), 0x22)).toBe('DTH:002100,22;\n');
    expect(formatDthBytes(addr(0x00, 0x21, 0x02), [0x08, 0x00])).toEqual(['DTH:002102,08;\n', 'DTH:002103,00;\n']);
    expect(formatRqh(addr(0x00, 0x21, 0x00), 2)).toBe('RQH:002100,000002;\n');
    expect(VER_COMMAND).toBe('VER;\n');
  });

  test('7bit 桁上がりで次のアドレスへ進む', () => {
    expect(formatDthBytes(addr(0x00, 0x21, 0x7f), [1, 2])).toEqual(['DTH:00217F,01;\n', 'DTH:002200,02;\n']);
  });

  test('受信メッセージの解釈', () => {
    expect(parseLanMessage('DTH:001B00,0100')).toEqual({ type: 'dth', addr: addr(0x00, 0x1b, 0x00), bytes: [1, 0] });
    expect(parseLanMessage('VER:V-160HD,3.60')).toEqual({ type: 'ver', model: 'V-160HD', version: '3.60' });
    expect(parseLanMessage('ERR:5')).toEqual({ type: 'err', code: 5 });
    expect(parseLanMessage('ACK')).toEqual({ type: 'ack' });
    expect(parseLanMessage('Enter password:')).toEqual({ type: 'prompt' });
    expect(parseLanMessage('Welcome to V-80HD.')).toEqual({ type: 'welcome', model: 'V-80HD' });
    expect(parseLanMessage('Welcome to V-160HD')).toEqual({ type: 'welcome', model: 'V-160HD' });
    expect(parseLanMessage('DTH:002100,1')).toEqual({ type: 'unknown', raw: 'DTH:002100,1' });
    expect(parseLanMessage('DTH:002100,FF')).toEqual({ type: 'unknown', raw: 'DTH:002100,FF' });
  });
});
