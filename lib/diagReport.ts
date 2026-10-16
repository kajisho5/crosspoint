import type { MidiEndpointInfo } from '@/modules/crosspoint-midi/src';
import type { LinkError, LinkState, LogEntry, TransportKind } from '@/core/transport/Transport';
import type { ModelId } from '@/core/profiles/types';
import { PROFILES } from '@/core/profiles';
import { formatTs } from './format';

/**
 * 診断レポート（SPEC §13 の実機確認を 1 回の共有で済ませるためのテキスト）。
 * アプリ・端末・接続状態・CoreMIDI 端点一覧・送受信ログをまとめる。純関数（画面は値を集めて渡すだけ）。
 */
export interface DiagReportInput {
  app: { name: string; version: string; build: string | null };
  device: { os: string; osVersion: string; model: string | null };
  connection: {
    link: LinkState;
    transport: TransportKind | null;
    deviceName: string | null;
    model: ModelId | null;
    version: string | null;
    rttMs: number | null;
    error: LinkError | null;
    demo: boolean;
  };
  /** ネイティブ MIDI が無い環境（Expo Go・Android）は null */
  endpoints: MidiEndpointInfo[] | null;
  lines: LogEntry[];
  now: number;
}

const HEX = (n: number): string => n.toString(16).toUpperCase().padStart(2, '0');

export function buildDiagReport(input: DiagReportInput): string {
  const out: string[] = [];
  const { app, device, connection, endpoints, lines } = input;

  out.push(`# SW CROSSPOINT 診断レポート`);
  out.push(`生成: ${new Date(input.now).toISOString()}`);
  out.push(`アプリ: ${app.name} ${app.version}${app.build ? ` (${app.build})` : ''}`);
  out.push(`端末: ${device.os} ${device.osVersion}${device.model ? ` / ${device.model}` : ''}`);
  out.push('');

  out.push('## 接続');
  out.push(`状態: ${connection.link}${connection.error ? `（${connection.error}）` : ''}${connection.demo ? ' [デモ]' : ''}`);
  out.push(`経路: ${connection.transport ?? '—'}`);
  out.push(`機器名: ${connection.deviceName ?? '—'}`);
  out.push(`機種: ${connection.model ?? '—'}　版: ${connection.version ?? '—'}　RTT: ${connection.rttMs == null ? '—' : `${connection.rttMs}ms`}`);
  if (connection.model) {
    const p = PROFILES[connection.model];
    out.push(
      `プロファイル: protocol=${p.protocol} modelId=${p.sysexModelId.length > 0 ? p.sysexModelId.map(HEX).join(' ') : '—'} lanAck=${p.lanAck} pw=${p.passwordLength} caps=${Object.entries(p.capabilities)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(',')}`,
    );
  }
  out.push('');

  out.push('## CoreMIDI 端点');
  if (endpoints == null) out.push('（ネイティブ MIDI モジュール無し：この環境では USB / Bluetooth は使えません）');
  else if (endpoints.length === 0) out.push('（端点なし）');
  else {
    for (const e of endpoints) {
      out.push(
        `- ${e.name} | device="${e.deviceName}" | transport=${e.transport} | online=${e.online ? 'yes' : 'no'} | driverOwner="${e.driverOwner}" | dest=${e.uniqueId} src=${e.sourceUniqueId}`,
      );
    }
  }
  out.push('');

  out.push(`## ログ（${lines.length} 件）`);
  for (const l of lines) out.push(`${formatTs(l.ts)} ${l.dir.toUpperCase().padEnd(4)} ${l.text}`);

  return out.join('\n');
}
