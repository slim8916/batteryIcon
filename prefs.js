// prefs.js — GNOME 48 (ESM)

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// Settings keys
const CHARGING_KEY = 'charging-threshold';
const DISCHARGING_KEY = 'discharging-threshold';

// Slider configuration
const SLIDER_MIN = 0;
const SLIDER_MAX = 100;
const SLIDER_STEP = 1;

// Window dimensions
const WINDOW_DEFAULT_WIDTH = 650;
const WINDOW_DEFAULT_HEIGHT = 220;

/**
 * BatteryIconPreferences - Preferences window for battery icon extension
 *
 * Provides a settings interface with sliders to configure battery thresholds
 * for showing/hiding the custom battery indicator.
 */
export default class BatteryIconPreferences extends ExtensionPreferences {
    /**
     * Fill the preferences window with settings controls
     *
     * @param {Adw.PreferencesWindow} window - The preferences window
     */
    fillPreferencesWindow(window) {
        try {
            Adw.init();

            const settings = this.getSettings();
            this._loadStylesheet();

            const page = this._createPreferencesPage();
            const group = this._createPreferencesGroup();

            window.add(page);
            page.add(group);

            // Add threshold controls
            this._addChargingThresholdRow(group, settings);
            this._addDischargingThresholdRow(group, settings);

            window.set_default_size(WINDOW_DEFAULT_WIDTH, WINDOW_DEFAULT_HEIGHT);
        } catch (error) {
            logError(error, '[BatteryIcon] Error filling preferences window');
        }
    }

    /**
     * Load custom stylesheet if available
     * @private
     */
    _loadStylesheet() {
        try {
            const cssProvider = new Gtk.CssProvider();
            const stylesheetPath = `${this.path}/stylesheet.css`;

            cssProvider.load_from_path(stylesheetPath);
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                cssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );
        } catch (error) {
            // Stylesheet is optional, continue without it
            log('[BatteryIcon] No custom stylesheet found, using default styles');
        }
    }

    /**
     * Create the main preferences page
     *
     * @returns {Adw.PreferencesPage} The preferences page
     * @private
     */
    _createPreferencesPage() {
        return new Adw.PreferencesPage();
    }

    /**
     * Create the preferences group
     *
     * @returns {Adw.PreferencesGroup} The preferences group
     * @private
     */
    _createPreferencesGroup() {
        return new Adw.PreferencesGroup({
            title: 'Battery Thresholds',
            description: 'Configure when the battery indicator is shown',
        });
    }

    /**
     * Create a scale widget for threshold adjustment
     *
     * @param {number} currentValue - Current threshold value
     * @returns {Gtk.Scale} The scale widget
     * @private
     */
    _createThresholdScale(currentValue) {
        const adjustment = new Gtk.Adjustment({
            lower: SLIDER_MIN,
            upper: SLIDER_MAX,
            step_increment: SLIDER_STEP,
            value: currentValue,
        });

        return new Gtk.Scale({
            adjustment: adjustment,
            digits: 0,
            hexpand: true,
            draw_value: true,
            value_pos: Gtk.PositionType.RIGHT,
        });
    }

    /**
     * Add charging threshold configuration row
     *
     * @param {Adw.PreferencesGroup} group - The preferences group
     * @param {Gio.Settings} settings - Settings object
     * @private
     */
    _addChargingThresholdRow(group, settings) {
        const row = new Adw.ActionRow({
            title: 'Charging Threshold',
            subtitle: 'Show indicator when charging below this percentage',
        });

        const scale = this._createThresholdScale(
            settings.get_int(CHARGING_KEY)
        );

        // Bind scale to settings
        scale.connect('value-changed', () => {
            const value = Math.round(scale.get_value());
            settings.set_int(CHARGING_KEY, value);
        });

        row.add_suffix(scale);
        row.activatable_widget = scale;
        group.add(row);
    }

    /**
     * Add discharging threshold configuration row
     *
     * @param {Adw.PreferencesGroup} group - The preferences group
     * @param {Gio.Settings} settings - Settings object
     * @private
     */
    _addDischargingThresholdRow(group, settings) {
        const row = new Adw.ActionRow({
            title: 'Discharging Threshold',
            subtitle: 'Show indicator when battery is below this percentage',
        });

        const scale = this._createThresholdScale(
            settings.get_int(DISCHARGING_KEY)
        );

        // Bind scale to settings
        scale.connect('value-changed', () => {
            const value = Math.round(scale.get_value());
            settings.set_int(DISCHARGING_KEY, value);
        });

        row.add_suffix(scale);
        row.activatable_widget = scale;
        group.add(row);
    }
}
