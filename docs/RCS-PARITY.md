# V-160HD RCS parity status

This document tracks SW CROSSPOINT against the user-visible V-160HD RCS / V-160HD Remote feature families. It is a scope and verification matrix, not a claim of parity. Communication details must continue to come from Roland's public guides, public OSS, or this app's own diagnostic report, as required by `docs/SPEC.md`.

## Status key

- **Implemented (spec)**: the repository's implementation specification defines the feature and the source tree has its implementation; this does not mean every transport/device combination was verified.
- **Partial**: only a subset of the RCS workflow or controls exists.
- **Unverified**: implementation is planned or present, but the relevant physical device/transport has not been verified.
- **Missing / unknown**: not implemented, or public specifications do not establish a safe control method.

## Feature matrix

| RCS feature family | Crosspoint status | Scope / remaining work |
|---|---|---|
| Video switcher: PGM/PST, CUT/AUTO, T-bar, MIX/WIPE and transition time | Implemented (spec); USB/iPhone unverified | Verify on-device for each connection path; Windows MIDI operation alone does not establish iPhone CoreMIDI support. |
| Input assignment and labels | Implemented (spec); hardware coverage unverified | Confirm read/write and label behavior on each supported transport. |
| PinP/KEY, DSK, SPLIT | Implemented (spec); hardware coverage unverified | Verify each control and state synchronization on the V-160HD. |
| Audio mixer levels and mute | Implemented (spec); hardware coverage unverified | Verify ranges, channel mapping, and feedback against the V-160HD. |
| Full parameter-address menu and camera-control parameters | Implemented (spec); hardware coverage unverified | Verify catalog entries and camera protocol workflows; UI controls do not prove every operation is safe or accepted by firmware. |
| AUX source selection and quick actions | Implemented (spec); hardware coverage unverified | Verify output assignment and bulk operations on hardware before claiming parity. |
| Preset/memory | Partial | Load, save, and initialize are implemented for V-160HD; names/current slot are displayed. Rename, thumbnail, and layout workflows remain missing. |
| Macros | Partial | Macro execution is in scope. Recording/editing/copy/move/swap workflows are missing. |
| Sequencer | Partial | Basic ON/AUTO/PREV/NEXT/JUMP controls are in scope. Building and editing sequences are missing. |
| GPO 1–16 | Missing / unknown | The repository notes no confirmed public address map; do not infer commands. |
| Still-image capture and still-image management | Missing / unknown | Capture from PGM/PVW/SUB and still-image name/delete workflows are not established in the current scope. |
| USB MONITOR video preview | Missing / unverified | Crosspoint has no documented equivalent of the RCS/Remote USB UVC monitor. iPhone external-camera support and this device path require a dedicated implementation and hardware verification. |
| RS-232 connection | Missing | Crosspoint's stated transports are LAN, USB MIDI, and Bluetooth MIDI. RS-232 requires a supported iPhone adapter/serial transport and is not part of the current implementation. |

## USB status from Windows

On 2026-10-19, Windows PnP exposed an interface named `Roland V-160HD MIDI` (VID/PID `0582:0269`). Its Compatible IDs reported `USB\Class_01&SubClass_01`. The iPhone CoreMIDI endpoint name and `driverOwner` remain unobserved. See `docs/verify/v160hd-20261019-windows-pnp.txt` and the V-160HD row in `docs/VERIFY.md`. This observation does not confirm iPhone USB support or full RCS parity.

## Completion criteria for an RCS parity claim

1. Convert each RCS feature family into a public-guide-backed requirement and a Crosspoint UI/control mapping.
2. Implement the missing supported functions without relying on RCS reverse engineering or captured communications.
3. Verify each implemented operation on the V-160HD using the app diagnostic report; separately verify LAN, USB MIDI, and Bluetooth where supported.
4. Verify USB endpoint enumeration and SysEx request/reply on a real iPhone before claiming iPhone USB support.
5. Record unsupported functions and firmware/transport constraints in the app UI and release notes.
