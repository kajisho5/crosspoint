# VERIFY — 実機確認の記録（SPEC §13）

目的：SPEC の【推測】【不明】を実機の観測で【事実】に置き換え、`core/profiles/<id>.ts` の capabilities / アドレス / 定数へ反映する。
ルール：根拠は **本アプリの診断レポート**（その他 → 診断 → 「レポート」で共有されるテキスト）か OS が公開する機器情報（Windows の PnP / macOS の `ioreg`）のみ。公式アプリ・RCS の解析・通信傍受で得た情報は書かない（CLAUDE.md）。

## 記録の書き方
1. 実機を繋ぎ、診断画面でログを「消去」→ 接続 → 対象の操作 → 「レポート」で共有（テキストをそのまま `docs/verify/<id>-<YYYYMMDD>.txt` に保存。パスワードは `••••` でマスク済み。IP だけ伏せる）
2. 下の表の「結果」に観測値、「根拠」に保存したファイル名と行（時刻）を書く
3. 「反映」に変更したファイルとコミットを書く。未確認は `—` のまま残す

凡例：✅ 確認済み（事実） / ❌ 想定と違った（修正済み） / — 未確認

---

## USB の正体（全機種共通の前提）
公開資料は「USB で操作できる（ドライバ不要）」までしか書いていない（V-160HD RCS Connection Guide eng02 p.2：USB STREAM に挿して RCS で USB を選ぶだけ。ドライバの配布無し）。アプリは **USB MIDI クラス（CoreMIDI に端点が出る）** を前提にしている（SPEC §5-2【推測】）。

| 機種 | OS 側で見えたクラス | iPhone の CoreMIDI 端点（名前 / driverOwner） | 結果 | 根拠 | 反映 |
|---|---|---|---|---|---|
| V-160HD | — | — | — | — | — |
| V-80HD | — | — | — | — | — |
| VR-120HD | — | — | — | — | — |
| VR-6HD | — | — | — | — | — |
| V-1-4K | — | — | — | — | — |
| V-8HD | — | — | — | — | — |
| V-02HD MK II | — | — | — | — | — |
| V-1HD | （ガイドに USB MIDI と明記） | — | — | — | — |

判定：
- `USB\Class_01&SubClass_03`（Windows CompatibleIds）/ `bInterfaceClass = 1, bInterfaceSubClass = 3`（macOS ioreg）/ iPhone で端点が出て driverOwner が `com.apple.AppleUSBMIDI…` → **USB MIDI クラス** → `capabilities.usb: true` を【事実】にする
- Vendor Specific（`Class_FF`）のみ、または iPhone に端点が出ない → USB は非対応にする（`usb: false`）。独自プロトコルは解析しない
- CDC（`Class_02`）も見える機種 → LAN テキスト/DTH をシリアル経由で流せる可能性【推測】。別途設計してから判断

Windows で過去の接続記録を見る（機器を挿していなくてよい）：
```powershell
Get-PnpDevice -PresentOnly:$false | Where-Object InstanceId -like 'USB\VID_0582*' | ForEach-Object { "$($_.FriendlyName) | $($_.InstanceId)"; (Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName DEVPKEY_Device_CompatibleIds).Data }
```
macOS：
```
ioreg -p IOUSB -l -w0 | grep -iE 'bInterfaceClass|bInterfaceSubClass|USB Product Name'
```

---

## V-160HD
### LAN
| 項目 | 想定（SPEC） | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| 認証プロンプト文字列 | `Enter password:` / `Welcome to V-160HD.` | — | — | — |
| ACK の実体 | 06H（ログ `ACK（06H）`）か文字列（`ACK（文字列 "ACK"）`） | — | — | — |
| VER 応答の終端 | `VER:V-160HD,3.60;` | — | — | — |
| 同時接続数 | 公式アプリ / Companion と同時に繋げるか | — | — | — |
| PGM/PST の値方式 | INPUT 3 → `RQH:002100,000002` が `22` | — | — | — |
| タリー購読応答長 | 42 | — | — | — |
| AUTO SW タップ | 01 → 150ms → 00 で遷移 | — | — | — |
| マクロ実行 `DTH:500504,nn;` | 本体のマクロが走る（nn = 番号−1） | — | — | — |
| シーケンサー `0B004F–52` | 押下/解放で反応 | — | — | — |
| 簡易制御 `CUT;` 等 | `ACK;`+LF、`QSEQSW;` → `SQS:…;ACK;` | — | — | — |
| USB OUTPUT ASSIGN のアドレス | ガイド `00 01 10`（`00 00 10` の誤植疑い） | — | — | — |
| F14 MONO=LR MIX | 無信号/モノ入力で ERR:4 か | — | — | — |

### USB / Bluetooth
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| USB 端点名・driverOwner | CoreMIDI に 1 端点 | — | — | — |
| RQ1 版応答 | DT1 `020000` 6 バイト数値 → `3.60` | — | — | — |
| USB で自発通知・タリー購読 | LAN と同じ | — | — | — |
| BLE ピッカー名 / ペアリング後の端点名 | `Roland V-160HD`【推測】 | — | — | — |
| BLE RQ1/DT1 往復・体感レイテンシ | — | — | — | — |
| BLE アプリ復帰時に online 維持 | 自動再接続 | — | — | — |
| AUDIO INPUT x / LABEL xx の対応と文字コード | ガイド通り | — | — | — |

## V-80HD（M3.5：最初に実施）
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| 認証文字列・PW 8 文字の送り方 | `Enter password:` / `Welcome to V-80HD.` | — | — | — |
| `ACK;` の実体 | stx 付き文字列 | — | — | — |
| 自発通知（本体で PGM 変更 → `DTH:001500,..`） | 来る | — | — | — |
| タリー購読 `DTH:0C0100,01;` | ERR か通知開始か | — | — | — |
| 0B 領域（本番外リハのみ） | 1 アドレスずつ | — | — | — |
| INPUT n = `0x28+n` | INPUT 3 → `2B` | — | — | — |
| USB / BLE 端点、RQ1 版 | — | — | — | — |
| AUDIO INPUT x=01–0F、LABEL xx=20–4F | — | — | — | — |

## VR-120HD
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| 認証・ack 06H | `Welcome to VR-120HD.` | — | — | — |
| INPUT n = `0x1C+n` | INPUT 3 → `1F` | — | — | — |
| タリー応答長 37、Input 1–8 = 1DH–24H | — | — | — | — |
| Preview Label `02 20 00`〜、AUDIO INPUT 01–18 | — | — | — | — |
| USB / BLE 端点、RQ1（Model ID 00 00 00 00 25） | — | — | — | — |
| F14 MONO=LR MIX の ERR:4 | — | — | — | — |

## VR-6HD
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| LAN 認証プロンプト・ack 06H | — | — | — | — |
| USB STREAM が CoreMIDI に見えるか | 見える【推測】 | — | — | — |
| BLE「Roland VR-6HD」ペアリングと RQ1 往復 | — | — | — | — |
| `CUT;` / `MCREX` の応答 | — | — | — | — |

## V-1-4K
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| LAN PW 8 文字の送り方（USER NAME の要否） | 不明 | — | — | — |
| ack が `stxACK;` か `ACK;`+LF か | — | — | — | — |
| USB STREAM が CoreMIDI に見えるか | — | — | — | — |
| CUT `0B001A` の押下/解放 | — | — | — | — |
| INPUT ASSIGN の相対値 | 00 = その番号の HDMI | — | — | — |

## V-8HD / V-02HD MK II
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| USB が USB MIDI クラスとして iPhone に見えるか | — | — | — | — |
| V-02HD MK II の Model ID | `00 00 00 00 0A`（`00 00 00 54` の可能性） | — | — | — |

## V-1HD
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| MIDI Rx SOURCE = USB で RQ1 版（`700000`） | ASCII 8 文字 | — | — | — |
| Device ID 既定 10H | — | — | — | — |
| A/B モードと PGM/PST モードの `710008/09` | — | — | — | — |
| 音声 0–127 と dB（u7ToDb） | 100 = 0dB【推測】 | — | — | — |

## V-1SDI / VR-4HD
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| USB MIDI インターフェース経由の MIDI IN で DT1/RQ1 | — | — | — | — |
| V-1SDI CTRL BUTTON 13H→53H で AUTO | — | — | — | — |
| VR-4HD PGM 書込で TRANSITION TYPE の遷移 | — | — | — | — |

## V-60HD
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| 接続直後の文字列（認証の有無） | 無し | — | — | — |
| `stxVER;` の応答 | `VER:V-60HD,x.xx;` | — | — | — |
| `QPL:7;` の値数 | 7 | — | — | — |
| 応答と ACK の順序、`QAL:13;` の値数 | — | — | — | — |
| `P1S;` が PinP 1 のトグルか | — | — | — | — |

## V-600UHD
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| Ver.3.00 パスワードの TCP 入力 | 不明 | — | — | — |
| `ACK`+LF の実体 | — | — | — | — |
| `IAL` の a の並び | — | — | — | — |
| `MEM:a;` の線形対応（1-1 = 0 … 8-8 = 63） | — | — | — | — |

## VR-50HD MK II
| 項目 | 想定 | 結果 | 根拠 | 反映 |
|---|---|---|---|---|
| `stxVER;` の応答文字列 | `VR-50HDMK2` | — | — | — |
| `PGM:a;` でトランジションが走るか | — | — | — | — |
| `QPG;` の応答 | — | — | — | — |
| `AUX:a;` の 4/5/6 の意味 | — | — | — | — |
