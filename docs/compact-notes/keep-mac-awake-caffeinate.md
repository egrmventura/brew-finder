# Keep the Mac awake during a Claude Code session

Claude Code runs as a process on this Mac. When the Mac sleeps, that process suspends and work stalls until it wakes. `caffeinate` (built into macOS) blocks sleep while a process runs.

## Starting a new session

```
caffeinate -is claude
```

- `-i` blocks idle sleep
- `-s` blocks system sleep while on AC power
- Mac stays awake exactly as long as this session is open

## Attaching to a session already running

In a second terminal window:

```
pgrep -l claude
caffeinate -is -w <PID>
```

Holds the Mac awake until that PID exits.

## Laptop lid

`caffeinate` does **not** prevent sleep when the lid closes. To run with the lid closed, use clamshell mode: power adapter + external display + external keyboard or mouse. Otherwise leave the lid open (the display can still turn off).

## Permanent setting (alternative to caffeinate)

System Settings → Battery → Options → "Prevent automatic sleeping on power adapter when the display is off" (Energy, on a desktop Mac).

Prefer `caffeinate` per session over changing this globally.
