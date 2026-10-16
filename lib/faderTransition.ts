import { encodeU14 } from '@/core/codec/value';
import { controller } from '@/core/controller/DeviceController';
import type { DeviceProfile } from '@/core/profiles/types';

/**
 * CUT/AUTO スイッチのアドレスが公開されていない機種（V-80HD / VR-120HD）の CUT/AUTO（featureRoute 'fader'）。
 * 公開アドレス PGM/PST Fader Level（0 = 未遷移、faderMax = 完了）に書く。USB/BLE/LAN 共通の SysEx。
 *  - CUT ：faderMax を 1 回書く → 本体が PGM/PST を入れ替え、Level 0 に戻る（V-80HD 実機で確認）
 *  - AUTO：TIME 秒かけて 0 → faderMax を STEP_MS ごとに書く（最後は必ず faderMax）
 * 書込みは楽観更新しない（完了と同時に本体側で Level が 0 に戻るため）。
 */
export const STEP_MS = 33;

let timer: ReturnType<typeof setInterval> | null = null;

export function isFaderAutoRunning(): boolean {
  return timer != null;
}

export function cancelFaderAuto(): void {
  if (timer != null) clearInterval(timer);
  timer = null;
}

function writeLevel(p: DeviceProfile, v: number): void {
  if (p.addrs.fader == null) return;
  controller.trigger(p.addrs.fader, encodeU14(Math.max(0, Math.min(p.faderMax, Math.round(v)))));
}

export function faderCut(p: DeviceProfile): void {
  cancelFaderAuto();
  writeLevel(p, p.faderMax);
}

/** AUTO の中間値列（テスト用に公開）：1..n 番目の値。最後は faderMax */
export function autoSteps(faderMax: number, seconds: number, stepMs = STEP_MS): number[] {
  const n = Math.max(1, Math.round((Math.max(0, seconds) * 1000) / stepMs));
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? faderMax : Math.round((faderMax * (i + 1)) / n)));
}

export function faderAuto(p: DeviceProfile, seconds: number, onDone?: () => void): void {
  cancelFaderAuto();
  const steps = autoSteps(p.faderMax, seconds);
  let i = 0;
  const tick = () => {
    const v = steps[i];
    if (v === undefined) return;
    writeLevel(p, v);
    i += 1;
    if (i >= steps.length) {
      cancelFaderAuto();
      onDone?.();
    }
  };
  if (steps.length === 1) {
    tick();
    return;
  }
  timer = setInterval(tick, STEP_MS);
  tick();
}
