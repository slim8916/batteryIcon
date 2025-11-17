# Battery Icon Extension

A GNOME Shell extension that replaces the default battery indicator with a circular, color-coded meter. Shows automatically based on configurable battery thresholds.

## Features

- Circular battery indicator with percentage display
- Color-coded: red (0%) → yellow (50%) → green (100%)
- Charging icon overlay when plugged in
- Auto show/hide based on battery level

## Installation

```bash
cd ~/.local/share/gnome-shell/extensions/batteryIcon@slim8916.github.io
glib-compile-schemas schemas/
gnome-extensions enable batteryIcon@slim8916.github.io
```

Restart GNOME Shell (Alt+F2, type `r` on X11, or log out/in on Wayland).

## Configuration

```bash
gnome-extensions prefs batteryIcon@slim8916.github.io
```

Set thresholds for when the indicator appears:
- **Charging threshold** (default: 80%)
- **Discharging threshold** (default: 90%)

## Requirements

GNOME Shell 45+

## License

MIT License - Copyright 2020 Just Perfection
