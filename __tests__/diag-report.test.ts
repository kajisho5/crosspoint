import { buildDiagReport } from '@/lib/diagReport';
import { escapeControl } from '@/core/transport/LanTransport';

describe('診断レポート（§13 用）', () => {
  const base = {
    app: { name: 'SW CROSSPOINT', version: '0.1.0', build: '8' },
    device: { os: 'ios', osVersion: '18.1', model: null },
    connection: {
      link: 'online' as const,
      transport: 'usb' as const,
      deviceName: 'DEMO-SW-A',
      model: 'V-8HD' as const,
      version: '2.00',
      rttMs: 12,
      error: null,
      demo: false,
    },
    lines: [
      { ts: 0, dir: 'tx' as const, text: 'F0 41 10 00 00 00 68 11 02 00 00 00 00 03 7B F7' },
      { ts: 1, dir: 'rx' as const, text: 'DT1 020000,020000' },
    ],
    now: Date.UTC(2026, 9, 16, 4, 0, 0),
  };

  test('端点・接続・プロファイル・ログを 1 テキストにまとめる', () => {
    const text = buildDiagReport({
      ...base,
      endpoints: [
        { uniqueId: 1001, sourceUniqueId: 1002, name: 'V-8HD', deviceName: 'V-8HD', transport: 'usb', online: true, driverOwner: 'com.apple.AppleUSBMIDI' },
        { uniqueId: 2001, sourceUniqueId: 0, name: 'Network Session 1', deviceName: 'Network', transport: 'network', online: false, driverOwner: 'com.apple.AppleMIDIRTPDriver' },
      ],
    });
    expect(text).toContain('# SW CROSSPOINT 診断レポート');
    expect(text).toContain('アプリ: SW CROSSPOINT 0.1.0 (8)');
    expect(text).toContain('端末: ios 18.1');
    expect(text).toContain('状態: online');
    expect(text).toContain('経路: usb');
    expect(text).toContain('機種: V-8HD　版: 2.00　RTT: 12ms');
    expect(text).toContain('プロファイル: protocol=sysex modelId=00 00 00 68 lanAck=');
    expect(text).toContain('- V-8HD | device="V-8HD" | transport=usb | online=yes | driverOwner="com.apple.AppleUSBMIDI" | dest=1001 src=1002');
    expect(text).toContain('- Network Session 1 | device="Network" | transport=network | online=no');
    expect(text).toContain('## ログ（2 件）');
    expect(text).toContain('RX   DT1 020000,020000');
  });

  test('ネイティブ無し・未接続でも壊れない', () => {
    const text = buildDiagReport({
      ...base,
      connection: { link: 'idle', transport: null, deviceName: null, model: null, version: null, rttMs: null, error: null, demo: false },
      endpoints: null,
      lines: [],
    });
    expect(text).toContain('（ネイティブ MIDI モジュール無し');
    expect(text).toContain('機種: —　版: —　RTT: —');
    expect(text).not.toContain('プロファイル:');
    expect(text).toContain('## ログ（0 件）');
  });

  test('端点ゼロ・エラー・デモ表示', () => {
    const text = buildDiagReport({
      ...base,
      connection: { ...base.connection, link: 'error', error: 'NO_RESPONSE', demo: true },
      endpoints: [],
    });
    expect(text).toContain('状態: error（NO_RESPONSE） [デモ]');
    expect(text).toContain('（端点なし）');
  });

  test('escapeControl：stx / ACK(06H) / LF / CR を可視化', () => {
    expect(escapeControl('\x02ACK;\n')).toBe('"<02>ACK;<0A>"');
    expect(escapeControl('\x06')).toBe('"<06>"');
    expect(escapeControl('Enter password:\r\n')).toBe('"Enter password:<0D><0A>"');
    expect(escapeControl('VER:V-160HD,3.60;')).toBe('"VER:V-160HD,3.60;"');
  });
});
