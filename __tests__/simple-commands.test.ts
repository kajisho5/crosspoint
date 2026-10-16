import { CMD_AUTO, CMD_CUT, cmdMacroExec, cmdMemoryLoad, cmdSeqAuto, cmdSeqJump, cmdSeqPrev, cmdSeqSw, parseSimpleReply, supportsSimpleCommands } from '@/core/codec/simpleCommands';
import { featureRoute } from '@/lib/features';
import { getProfile } from '@/core/profiles';
import { simulateSimpleCommand } from '@/core/transport/simpleCommandSim';

/** LAN/RS-232 簡易制御コマンド Ver.02（公式公開資料）の表記どおりか */
describe('簡易制御コマンド：組み立て', () => {
  test('CUT / ATO / MCREX / SEQ / MEM', () => {
    expect(CMD_CUT).toBe('CUT;');
    expect(CMD_AUTO).toBe('ATO;');
    expect(cmdMacroExec(1)).toBe('MCREX:MACRO1;');
    expect(cmdMacroExec(100)).toBe('MCREX:MACRO100;');
    expect(cmdMacroExec(101)).toBe('MCREX:MACRO100;'); // 範囲にクランプ
    expect(cmdSeqSw(true)).toBe('SEQSW:ON;');
    expect(cmdSeqAuto(false)).toBe('SEQAS:OFF;');
    expect(cmdSeqPrev()).toBe('SEQPV;');
    expect(cmdSeqPrev(true)).toBe('SEQPV:1;');
    expect(cmdSeqJump('START')).toBe('SEQJP:START;');
    expect(cmdSeqJump(12)).toBe('SEQJP:SEQ12;');
    expect(cmdMemoryLoad(32)).toBe('MEM:MEMORY32;');
  });

  test('応答の解釈', () => {
    expect(parseSimpleReply('SQS:ON')).toEqual({ kind: 'seqSw', on: true });
    expect(parseSimpleReply('SQA:OFF;')).toEqual({ kind: 'seqAuto', on: false });
    expect(parseSimpleReply('MCRST:MACRO3,ON')).toEqual({ kind: 'macroState', n: 3, on: true });
    expect(parseSimpleReply('TLY:0,1,2,3')).toEqual({ kind: 'tally', states: [0, 1, 2, 3] });
    expect(parseSimpleReply('DTH:000000,01')).toBeNull();
  });

  test('対応 FW：V-160HD 3.5 / V-80HD 1.3 / VR-120HD 2.2 以降（不明なら使ってみる）', () => {
    expect(supportsSimpleCommands('V-160HD', '3.60')).toBe(true);
    expect(supportsSimpleCommands('V-160HD', '3.41')).toBe(false);
    expect(supportsSimpleCommands('V-80HD', '1.30')).toBe(true);
    expect(supportsSimpleCommands('V-80HD', '1.2')).toBe(false);
    expect(supportsSimpleCommands('VR-120HD', '2.00')).toBe(false);
    expect(supportsSimpleCommands('VR-120HD', '2.20')).toBe(true);
    expect(supportsSimpleCommands('VR-120HD', null)).toBe(true);
  });
});

describe('機能の経路（lib/features）', () => {
  const v160 = getProfile('V-160HD');
  const v80 = getProfile('V-80HD');
  const vr120 = getProfile('VR-120HD');
  test('V-160HD：CUT/AUTO は常に SysEx（0B）、マクロは LAN なら text / USB なら 50 05 04', () => {
    expect(featureRoute('cutAuto', v160, 'lan', '3.60')).toBe('sysex');
    expect(featureRoute('cutAuto', v160, 'usb', '3.60')).toBe('sysex');
    expect(featureRoute('macro', v160, 'lan', '3.60')).toBe('text');
    expect(featureRoute('macro', v160, 'usb', '3.60')).toBe('sysex');
    expect(featureRoute('macro', v160, 'lan', '3.40')).toBe('sysex'); // 旧 FW は Companion 由来のアドレス
    expect(featureRoute('sequencer', v160, 'ble', null)).toBe('sysex');
  });
  test('V-80HD / VR-120HD：CUT/AUTO は LAN（対応 FW）なら text、それ以外（USB/BLE・旧 FW）は Fader Level', () => {
    expect(featureRoute('cutAuto', v80, 'lan', '1.30')).toBe('text');
    expect(featureRoute('cutAuto', v80, 'lan', '1.20')).toBe('fader');
    expect(featureRoute('cutAuto', v80, 'usb', null)).toBe('fader');
    expect(featureRoute('cutAuto', v80, 'ble', null)).toBe('fader');
    expect(featureRoute('cutAuto', vr120, 'usb', null)).toBe('fader');
    expect(featureRoute('macro', vr120, 'lan', '2.20')).toBe('text');
    expect(featureRoute('macro', vr120, 'usb', '2.20')).toBeNull();
    expect(featureRoute('sequencer', vr120, 'mock', null)).toBe('text');
  });
});

describe('簡易制御コマンドの模擬（モック共通）', () => {
  const hooks = () => {
    const calls: string[] = [];
    const seq = { on: false, auto: false };
    return {
      calls,
      h: {
        swap: () => calls.push('swap'),
        autoMs: () => 0,
        later: (fn: () => void) => fn(),
        loadMemory: (n: number) => calls.push(`mem${n}`),
        tally: () => [0, 1, 2],
        seq: { get: () => seq, set: (v: { on?: boolean; auto?: boolean }) => Object.assign(seq, v) },
      },
    };
  };
  test('CUT / ATO は PGM/PST 入替、MEM は呼出し、SEQ 系は状態、未知は ERR:0', () => {
    const { calls, h } = hooks();
    expect(simulateSimpleCommand('CUT;', h)).toEqual(['ACK']);
    expect(simulateSimpleCommand('ATO;', h)).toEqual(['ACK']);
    expect(calls).toEqual(['swap', 'swap']);
    expect(simulateSimpleCommand('MEM:MEMORY5;', h)).toEqual(['ACK']);
    expect(calls).toContain('mem5');
    expect(simulateSimpleCommand('MCREX:MACRO7;', h)).toEqual(['ACK']);
    expect(simulateSimpleCommand('MCREX:MACRO0;', h)).toEqual(['ERR:5']);
    expect(simulateSimpleCommand('SEQSW:ON;', h)).toEqual(['ACK']);
    expect(simulateSimpleCommand('QSEQSW;', h)).toEqual(['SQS:ON', 'ACK']);
    expect(simulateSimpleCommand('QSEQAS;', h)).toEqual(['SQA:OFF', 'ACK']);
    expect(simulateSimpleCommand('TLY;', h)).toEqual(['TLY:0,1,2', 'ACK']);
    expect(simulateSimpleCommand('XYZ;', h)).toEqual(['ERR:0']);
  });
});

describe('新機種の経路（VR-6HD / V-1-4K）', () => {
  test('VR-6HD：LAN では CUT/AUTO・マクロ・シーケンサーが簡易制御コマンド。USB/BLE では CUT/AUTO 無し', () => {
    const p = getProfile('VR-6HD');
    expect(featureRoute('cutAuto', p, 'lan', '2.20')).toBe('text');
    expect(featureRoute('macro', p, 'lan', '2.20')).toBe('text');
    expect(featureRoute('sequencer', p, 'lan', '2.20')).toBe('text');
    expect(featureRoute('cutAuto', p, 'usb', '2.20')).toBeNull();
    expect(featureRoute('macro', p, 'ble', '2.20')).toBeNull();
    expect(featureRoute('cutAuto', p, 'lan', '2.10')).toBeNull();
  });
  test('V-1-4K：CUT/AUTO は SysEx（0B 00 1A/1B）、マクロ・シーケンサーは簡易制御コマンドでも無し', () => {
    const p = getProfile('V-1-4K');
    expect(featureRoute('cutAuto', p, 'lan', '1.00')).toBe('sysex');
    expect(featureRoute('cutAuto', p, 'usb', '1.00')).toBe('sysex');
    expect(featureRoute('macro', p, 'lan', '1.00')).toBeNull();
    expect(featureRoute('sequencer', p, 'lan', '1.00')).toBeNull();
    expect(supportsSimpleCommands('V-1-4K', '1.00')).toBe(true);
  });
});
