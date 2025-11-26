// extension.js — GNOME 48 (ESM)

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import UPowerGlib from 'gi://UPowerGlib';
import Rsvg from 'gi://Rsvg';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import Cairo from 'cairo';

// Settings keys
const CHARGING_KEY = 'charging-threshold';
const DISCHARGING_KEY = 'discharging-threshold';

// Visual constants
const PANEL_SIZE_RATIO = 0.9;
const MIN_INDICATOR_SIZE = 22;
const RING_OUTER_PADDING = 2;
const RING_INNER_RATIO = 0.9;
const ARC_START_ANGLE = -Math.PI / 2;
const DEGREES_PER_PERCENT = 3.6;
const FONT_SIZE_RATIO = 0.33;
const CHARGING_ICON_SCALE = 1.7;
const CHARGING_ICON_SPACING = 1.05;






// Battery color thresholds
const LOW_BATTERY_THRESHOLD = 50;

// Update interval in seconds
const UPDATE_INTERVAL_SECONDS = 2;

// Battery percentage limits
const MIN_BATTERY_PERCENT = 0;
const MAX_BATTERY_PERCENT = 100;

/**
 * CircleIndicator - Custom battery indicator widget
 *
 * Displays battery percentage as a colored circular progress ring
 * with optional charging icon overlay.
 */
const CircleIndicator = GObject.registerClass(
class CircleIndicator extends St.DrawingArea {
    /**
     * Initialize the circular battery indicator
     *
     * @param {Object} status - Battery status object
     * @param {number} status.percentage - Battery percentage (0-100)
     * @param {boolean} status.isCharging - Charging state
     * @param {string} extensionPath - Absolute path to extension directory
     */
    _init(status, extensionPath) {
        const size = this._calculateSize();
        super._init({width: size, height: size});

        this._status = status;
        this._extensionPath = extensionPath;
        this._color = this._calculateColor();
        this._cachedSvgSurface = null;
        this._repaintId = this.connect('repaint', this._onRepaint.bind(this));

        this.visible = true;
    }

    /**
     * Calculate indicator size based on panel height
     *
     * @returns {number} Indicator size in pixels
     * @private
     */
    _calculateSize() {
        return Math.max(MIN_INDICATOR_SIZE,
                       Math.floor(Main.panel.height * PANEL_SIZE_RATIO));
    }

    /**
     * Calculate color based on battery percentage
     * Red (0%) -> Yellow (50%) -> Green (100%)
     *
     * @returns {number[]} RGB color array [r, g, b]
     * @private
     */
    _calculateColor() {
        const percentage = this._status.percentage;

        if (percentage < MIN_BATTERY_PERCENT || percentage > MAX_BATTERY_PERCENT) {
            return [0, 0, 0]; // Invalid percentage
        }

        let red, green;
        const blue = 0;

        if (percentage <= LOW_BATTERY_THRESHOLD) {
            // Red (0%) -> Yellow (50%)
            red = 1;
            green = percentage / LOW_BATTERY_THRESHOLD;
        } else {
            // Yellow (50%) -> Green (100%)
            green = 1;
            red = 1 - (percentage - LOW_BATTERY_THRESHOLD) / LOW_BATTERY_THRESHOLD;
        }

        return [red, green, blue];
    }

    /**
     * Load and cache charging SVG icon
     *
     * @param {number} red - Red color component (0-1)
     * @param {number} green - Green color component (0-1)
     * @param {number} blue - Blue color component (0-1)
     * @returns {Cairo.Surface|null} Tinted SVG surface or null on error
     * @private
     */
    _loadChargingSvg(red, green, blue) {
        try {
            const svgPath = `${this._extensionPath}/charging.svg`;
            const handle = Rsvg.Handle.new_from_file(svgPath);

            if (!handle) {
                throw new Error(`Failed to load SVG from ${svgPath}`);
            }

            const dimensions = handle.get_dimensions();
            const svgWidth = dimensions.width;
            const svgHeight = dimensions.height;

            // Render SVG to surface
            const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32,
                                                   svgWidth, svgHeight);
            const context = new Cairo.Context(surface);
            handle.render_cairo(context);

            // Apply color tint
            const tintSurface = new Cairo.ImageSurface(Cairo.Format.ARGB32,
                                                       svgWidth, svgHeight);
            const tintContext = new Cairo.Context(tintSurface);
            tintContext.setSourceSurface(surface, 0, 0);
            tintContext.paint();
            tintContext.setOperator(Cairo.Operator.IN);
            tintContext.setSourceRGB(red, green, blue);
            tintContext.paint();

            return tintSurface;
        } catch (error) {
            console.error(`[BatteryIcon] Failed to load charging icon`, error);
            return null;
        }
    }

    /**
     * Draw the charging icon on the context
     *
     * @param {Cairo.Context} context - Cairo drawing context
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {Object} textExtents - Text extents for positioning
     * @param {number} red - Red color component
     * @param {number} green - Green color component
     * @param {number} blue - Blue color component
     * @returns {number} New X position for text
     * @private
     */
    _drawChargingIcon(context, centerX, centerY, textExtents, red, green, blue) {
        const svgSurface = this._loadChargingSvg(red, green, blue);

        if (!svgSurface) {
            return centerX - textExtents.width / 2; // Return default text position
        }

        const svgHeight = svgSurface.getHeight();
        const svgWidth = svgSurface.getWidth();

        const scale = (textExtents.height * CHARGING_ICON_SCALE) / svgHeight;
        const scaledWidth = svgWidth * scale;
        const scaledHeight = svgHeight * scale;

        const iconX = centerX - CHARGING_ICON_SPACING * (textExtents.width + scaledWidth) / 2;
        const iconY = centerY - scaledHeight / 2;
        const textX = iconX + scaledWidth-5;




        context.save();
        context.scale(scale, scale);
        context.setSourceSurface(svgSurface, iconX / scale, iconY / scale);
        context.paint();
        context.restore();

        return textX;
    }

    /**
     * Repaint handler - draws the battery indicator
     *
     * @param {St.DrawingArea} area - Drawing area widget
     * @private
     */
    _onRepaint(area) {
        const context = area.get_context();
        const [width, height] = area.get_surface_size();

        // Clear canvas
        context.setSourceRGBA(0, 0, 0, 0);
        context.setOperator(Cairo.Operator.CLEAR);
        context.paint();
        context.setOperator(Cairo.Operator.OVER);

        const [red, green, blue] = this._color;
        context.setSourceRGB(red, green, blue);

        // Calculate dimensions
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(width, height) / 2 - RING_OUTER_PADDING;
        const innerRadius = outerRadius * RING_INNER_RATIO;

        // Draw battery ring
        const arcEndAngle = (270 - (MAX_BATTERY_PERCENT - this._status.percentage) *
                            DEGREES_PER_PERCENT) * Math.PI / 180;

        context.arc(centerX, centerY, outerRadius, ARC_START_ANGLE, arcEndAngle);
        context.arcNegative(centerX, centerY, innerRadius, arcEndAngle, ARC_START_ANGLE);
        context.closePath();
        context.fill();

        // Draw percentage text
        context.selectFontFace('Sans', Cairo.FontSlant.NORMAL, Cairo.FontWeight.BOLD);
        context.setFontSize(Math.round(height * FONT_SIZE_RATIO));

        const text = String(this._status.percentage);
        const textExtents = context.textExtents(text);
        let textX = centerX - textExtents.width / 2;
        const textY = centerY + textExtents.height / 2;

        // Draw charging icon if applicable
        if (this._status.isCharging) {
            textX = this._drawChargingIcon(context, centerX, centerY,
                                          textExtents, red, green, blue);
        }

        context.setSourceRGB(red, green, blue);
        context.moveTo(textX, textY);
        context.showText(text);
        context.stroke();
    }

    /**
     * Update battery status and trigger repaint
     *
     * @param {Object} status - New battery status
     * @param {number} status.percentage - Battery percentage (0-100)
     * @param {boolean} status.isCharging - Charging state
     */
    update(status) {
        this._status = status;
        this._color = this._calculateColor();
        this.queue_repaint();
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this._repaintId) {
            this.disconnect(this._repaintId);
            this._repaintId = 0;
        }

        this._cachedSvgSurface = null;

        super.destroy();
    }
});

/**
 * BatteryIconExtension - Main extension class
 *
 * Replaces the default GNOME battery indicator with a custom circular
 * indicator that shows/hides based on configurable thresholds.
 */
export default class BatteryIconExtension extends Extension {
    /**
     * Enable the extension
     */
    enable() {
        this._initializeSettings();
        this._initializeUPower();
        this._createIndicator();
        this._setupSignals();
        this._startUpdateTimer();

        console.debug('[BatteryIcon] Extension enabled successfully');
    }

    /**
     * Initialize settings
     * @private
     */
    _initializeSettings() {
        this._settings = this.getSettings();
    }

    /**
     * Initialize UPower client and device
     * @private
     */
    _initializeUPower() {
        this._upowerClient = UPowerGlib.Client.new();
        this._device = this._upowerClient.get_display_device();

        if (!this._device) {
            throw new Error('Failed to get UPower display device');
        }
    }

    /**
     * Create and position the indicator widget
     * @private
     */
    _createIndicator() {
        // Find system indicators
        this._system = Main.panel.statusArea.quickSettings?._system ?? null;
        this._stockIcon = this._system?._indicator ?? null;
        this._iconParent = this._stockIcon?.get_parent() ?? null;

        // Create custom indicator
        this._indicator = new CircleIndicator(
            {percentage: -1, isCharging: false},
            this.path
        );

        // Position indicator
        if (this._iconParent && this._stockIcon) {
            this._iconParent.insert_child_above(this._indicator, this._stockIcon);
            this._stockWasVisible = this._stockIcon.visible;

            // Defer hiding to ensure panel is fully initialized
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (this._stockIcon) {
                    this._stockIcon.hide();
                }
                return GLib.SOURCE_REMOVE;
            });
        } else {
            // Fallback if panel structure changed
            console.warn('[BatteryIcon] Warning: Using fallback positioning');
            Main.panel._rightBox.insert_child_at_index(this._indicator, 0);
        }
    }

    /**
     * Set up signal connections
     * @private
     */
    _setupSignals() {
        this._signals = [
            this._settings.connect(`changed::${CHARGING_KEY}`,
                                  () => this._updateIndicator()),
            this._settings.connect(`changed::${DISCHARGING_KEY}`,
                                  () => this._updateIndicator()),
            this._device.connect('notify::percentage',
                                () => this._updateIndicator()),
            this._device.connect('notify::state',
                                () => this._updateIndicator()),
        ];
    }

    /**
     * Start periodic update timer
     * @private
     */
    _startUpdateTimer() {
        this._updateIndicator();

        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            UPDATE_INTERVAL_SECONDS,
            () => {
                this._updateIndicator();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    /**
     * Get validated threshold from settings
     *
     * @param {string} key - Settings key
     * @returns {number} Validated threshold value (0-100)
     * @private
     */
    _getValidatedThreshold(key) {
        const value = this._settings.get_int(key);
        return Math.max(MIN_BATTERY_PERCENT,
                       Math.min(MAX_BATTERY_PERCENT, value));
    }

    /**
     * Update indicator visibility and status
     * @private
     */
    _updateIndicator() {
        const percentage = Math.round(this._device.percentage ?? -1);
        const isCharging = this._device.state === UPowerGlib.DeviceState.CHARGING;

        // Try to find stock icon if not found during initial setup
        if (!this._stockIcon) {
            this._system = Main.panel.statusArea.quickSettings?._system ?? null;
            this._stockIcon = this._system?._indicator ?? null;
            this._iconParent = this._stockIcon?.get_parent() ?? null;

            // Reposition custom indicator if we found the stock icon
            if (this._iconParent && this._stockIcon && this._indicator) {
                this._stockWasVisible = this._stockIcon.visible;
                if (this._indicator.get_parent() !== this._iconParent) {
                    const oldParent = this._indicator.get_parent();
                    if (oldParent) {
                        oldParent.remove_child(this._indicator);
                    }
                    this._iconParent.insert_child_above(this._indicator, this._stockIcon);
                }
            }
        }

        // Ensure stock icon stays hidden
        if (this._stockIcon) {
            this._stockIcon.hide();
        }

        // Hide indicator if battery info unavailable
        if (percentage < MIN_BATTERY_PERCENT) {
            this._indicator?.hide();
            return;
        }

        // Update indicator display
        this._indicator?.update({percentage, isCharging});

        // Determine visibility based on thresholds
        const chargingThreshold = this._getValidatedThreshold(CHARGING_KEY);
        const dischargingThreshold = this._getValidatedThreshold(DISCHARGING_KEY);

        const shouldShow = isCharging
            ? (percentage < chargingThreshold || percentage < dischargingThreshold)
            : (percentage < dischargingThreshold);

        if (shouldShow) {
            this._indicator?.show();
        } else {
            this._indicator?.hide();
        }
    }

    /**
     * Disable the extension and clean up resources
     */
    disable() {
        this._stopUpdateTimer();
        this._disconnectSignals();
        this._restoreStockIcon();
        this._destroyIndicator();
        this._cleanupReferences();

        console.debug('[BatteryIcon] Extension disabled successfully');
    }

    /**
     * Stop update timer
     * @private
     */
    _stopUpdateTimer() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
    }

    /**
     * Disconnect all signals
     * @private
     */
    _disconnectSignals() {
        for (const signalId of this._signals ?? []) {
            if (this._settings && signalId) {
                this._settings.disconnect(signalId);
            }
        }
        this._signals = [];
    }

    /**
     * Restore stock battery icon
     * @private
     */
    _restoreStockIcon() {
        if (this._iconParent && this._stockIcon) {
            if (this._stockWasVisible) {
                this._stockIcon.show();
            }

            if (this._indicator && this._iconParent.contains(this._indicator)) {
                this._iconParent.remove_child(this._indicator);
            }
        }
    }

    /**
     * Destroy indicator widget
     * @private
     */
    _destroyIndicator() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    /**
     * Clean up object references
     * @private
     */
    _cleanupReferences() {
        this._device = null;
        this._upowerClient = null;
        this._settings = null;
        this._system = null;
        this._stockIcon = null;
        this._iconParent = null;
    }
}
