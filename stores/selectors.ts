import { useShallow } from 'zustand/react/shallow';
import { decodeAscii8, decodeLevel, decodeTime, decodeU14, u7ToDb } from '@/core/codec/value';
import { getProfile, sourceName } from '@/core/profiles';
import type { DeviceProfile, KeyKind, TallyState } from '@/core/profiles/types';
import { useConnectionStore } from './connection';
import { readBytes, useByte, useBytes, useParamStore } from './param';

/** 派生セレクタ（DESIGN §5）。値が未受信なら null を返し、画面は「—」を表示する */

/** 接続中の機種のプロファイル（未接続は null） */
export function useProfile(): DeviceProfile | null {
  const model = useConnectionStore((s) => s.model);
  return model ? getProfile(model) : null;
}

/** 画面レイアウト用（未接続でも直近機種か V-160HD で枠を描く） */
export function useLayoutProfile(): DeviceProfile {
  return useProfile() ?? getProfile('V-160HD');
}

export function useOnline(): boolean {
  return useConnectionStore((s) => s.link === 'online');
}

/** INPUT n の割当をソース code で返す（割当値が相対な機種は変換。V-1-4K） */
function assignLookup(p: DeviceProfile, values: Record<number, number>) {
  return (n: number) => {
    if (p.addrs.inputAssign == null) return p.assignToSource(n, 0) ?? undefined;
    const v = values[p.addrs.inputAssign(n)];
    if (v === undefined) return undefined;
    return p.assignToSource(n, v) ?? undefined;
  };
}

export function assignedSource(p: DeviceProfile, values: Record<number, number>, n: number): number | undefined {
  return assignLookup(p, values)(n);
}

/** PGM / PST の INPUT 番号 */
export function useBusInput(p: DeviceProfile, bus: 'pgm' | 'pst'): number | null {
  return useParamStore((s) => {
    const a = bus === 'pgm' ? p.addrs.pgm : p.addrs.pst;
    if (a == null) return null;
    const v = s.values[a];
    if (v === undefined) return null;
    return p.decodeInput(v, assignLookup(p, s.values));
  });
}

/** INPUT 1..inputCount のタリー（タリーブロック＋PGM/PST から合成） */
export function useTallies(p: DeviceProfile): TallyState[] {
  return useParamStore(
    useShallow((s) => {
      const lookup = assignLookup(p, s.values);
      const pgmV = s.values[p.addrs.pgm];
      const pstV = p.addrs.pst == null ? undefined : s.values[p.addrs.pst];
      const pgm = pgmV === undefined ? null : p.decodeInput(pgmV, lookup);
      const pst = pstV === undefined ? null : p.decodeInput(pstV, lookup);
      const block = p.addrs.tallyBlock == null ? [] : readBytes(s.values, p.addrs.tallyBlock, p.addrs.tallyBlockSize).map((b) => b ?? 0);
      return Array.from({ length: p.inputCount }, (_, i) => {
        const n = i + 1;
        const fromBlock = p.tallyOf(n, block);
        const isPgm = n === pgm || fromBlock === 'pgm' || fromBlock === 'both';
        const isPst = n === pst || fromBlock === 'pst' || fromBlock === 'both';
        if (isPgm && isPst) return 'both';
        if (isPgm) return 'pgm';
        if (isPst) return 'pst';
        return 'off';
      });
    }),
  );
}

/** ソース code の表示名（8 文字ラベル → 既定名） */
export function labelOfSource(p: DeviceProfile, values: Record<number, number>, code: number): string {
  const src = p.sources.find((x) => x.code === code);
  if (src?.labelAddr != null) {
    const bytes = readBytes(values, src.labelAddr, 8);
    if (bytes.every((b) => b !== undefined)) {
      const text = decodeAscii8(bytes as number[]).trim();
      if (text.length > 0) return text;
    }
  }
  return sourceName(p, code);
}

/** INPUT 1..inputCount のラベル */
export function useInputLabels(p: DeviceProfile): string[] {
  return useParamStore(
    useShallow((s) =>
      Array.from({ length: p.inputCount }, (_, i) => {
        const code = assignedSource(p, s.values, i + 1);
        return code === undefined ? `INPUT ${i + 1}` : labelOfSource(p, s.values, code);
      }),
    ),
  );
}

export function useSourceLabel(p: DeviceProfile, code: number | undefined): string | null {
  return useParamStore((s) => (code === undefined ? null : labelOfSource(p, s.values, code)));
}

/** Tバー 0–2047 */
export function useFader(p: DeviceProfile): number | null {
  const b = useBytes(p.addrs.fader, 2);
  return b && p.addrs.fader != null ? decodeU14(b) : null;
}

/** トランジション：0=MIX / 1=WIPE */
export function useTransType(p: DeviceProfile): number | null {
  return useByte(p.addrs.transType) ?? null;
}

/** INPUT n のラベルを決める割当ソース（inputAssign が無い機種は固定の物理入力） */

/** トランジション時間（秒） */
export function useTransTime(p: DeviceProfile): number | null {
  const v = useByte(p.addrs.transTime);
  return v === undefined ? null : decodeTime([v]);
}

export interface KeyState {
  pgm: boolean | null;
  pvw: boolean | null;
  source: number | undefined;
  type: number | undefined;
  time: number | null;
}

export function useKey(p: DeviceProfile, kind: KeyKind, n: number): KeyState {
  const k = kind === 'pinp' ? p.addrs.pinp(n) : p.addrs.dsk(n);
  return useParamStore(
    useShallow((s) => {
      const pgm = s.values[k.pgm];
      const pvw = k.pvw == null ? undefined : s.values[k.pvw];
      const time = k.time == null ? undefined : s.values[k.time];
      return {
        pgm: pgm === undefined ? null : pgm === 1,
        pvw: pvw === undefined ? null : pvw === 1,
        source: k.source == null ? undefined : s.values[k.source],
        type: k.type != null ? s.values[k.type] : undefined,
        time: time === undefined ? null : decodeTime([time]),
      };
    }),
  );
}

export function useSplit(p: DeviceProfile, n: number): boolean | null {
  const v = useByte(p.addrs.split(n));
  return v === undefined ? null : v === 1;
}

export interface ChannelState {
  /** dB（−INF は null）。未受信は undefined */
  db: number | null | undefined;
  mute: boolean | null;
}

function useChannelAt(p: DeviceProfile, levelAddr: number, muteAddr: number | null): ChannelState {
  const lv = useBytes(levelAddr, p.audioLevelCodec === 'db3' ? 3 : 1);
  const mute = useByte(muteAddr);
  const db = lv ? (p.audioLevelCodec === 'db3' ? decodeLevel(lv) : u7ToDb(lv[0] ?? 0)) : undefined;
  return { db, mute: muteAddr == null ? null : mute === undefined ? null : mute === 1 };
}

export function useChannel(p: DeviceProfile, x: number): ChannelState {
  return useChannelAt(p, p.addrs.audioLevel(x), p.addrs.audioMute ? p.addrs.audioMute(x) : null);
}

export function useMaster(p: DeviceProfile): ChannelState {
  return useChannelAt(p, p.addrs.masterLevel, p.addrs.masterMute);
}

/** 現在のメモリー番号（1 始まり。7F=Last などは null） */
export function useMemCurrent(p: DeviceProfile): number | null {
  const v = useByte(p.addrs.memCurrent);
  if (p.addrs.memCurrent == null || v === undefined || v >= p.memoryCount) return null;
  return v + 1;
}

export function useMemNames(p: DeviceProfile): (string | null)[] {
  return useParamStore(
    useShallow((s) =>
      Array.from({ length: p.memoryCount }, (_, i) => {
        if (p.addrs.memName == null) return null;
        const b = readBytes(s.values, p.addrs.memName(i + 1), 8);
        if (b.some((x) => x === undefined)) return null;
        return decodeAscii8(b as number[]).trim();
      }),
    ),
  );
}

/** ヘッダー副題（機器名 · 機種） */
export function useDeviceSubtitle(): string {
  return useConnectionStore((s) => (s.deviceName && s.model ? `${s.deviceName} · ${s.model}` : '未接続'));
}
