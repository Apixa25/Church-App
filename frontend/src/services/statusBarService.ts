import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

class StatusBarService {
  async initialize() {
    // Only run on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('Status bar service: Running in web mode, skipping native configuration');
      return;
    }

    try {
      // Set dark style to match app theme
      await StatusBar.setStyle({ style: Style.Dark });

      // Set background color to match app's dark theme
      await StatusBar.setBackgroundColor({ color: '#141420' });

      // Show the status bar (in case it was hidden)
      await StatusBar.show();

      console.log('Status bar configured successfully');
    } catch (error) {
      console.error('Failed to configure status bar:', error);
    }
  }

  async hide() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await StatusBar.hide();
    } catch (error) {
      console.error('Failed to hide status bar:', error);
    }
  }

  async show() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await StatusBar.show();
    } catch (error) {
      console.error('Failed to show status bar:', error);
    }
  }
}

export default new StatusBarService();
