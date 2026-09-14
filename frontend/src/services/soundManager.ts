import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';

// Free high-quality synthesized alarm tone streams / data URLs for rich alarm sounds
const ALARM_SOUND_URIS: Record<string, string> = {
  default: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
  radar: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  chime: 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg',
  energetic: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
};

class SoundManager {
  private soundObject: Audio.Sound | null = null;
  private isAlarmPlaying: boolean = false;
  private vibrationInterval: any = null;

  async initAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.warn('Could not configure audio mode:', e);
    }
  }

  async playAlarm(soundKey: string = 'default') {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    try {
      await this.initAudio();

      // Start strong vibration pattern in loop
      const VIBE_PATTERN = [0, 800, 400, 800, 400, 1000];
      Vibration.vibrate(VIBE_PATTERN, true);

      // Play audio ringtone
      const soundUri = ALARM_SOUND_URIS[soundKey] || ALARM_SOUND_URIS.default;
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      this.soundObject = sound;
    } catch (err) {
      console.warn('Failed to play alarm audio via expo-av, keeping vibration:', err);
    }
  }

  async stopAlarm() {
    this.isAlarmPlaying = false;

    // Stop vibration
    try {
      Vibration.cancel();
      if (this.vibrationInterval) {
        clearInterval(this.vibrationInterval);
        this.vibrationInterval = null;
      }
    } catch (e) {
      console.warn('Error stopping vibration:', e);
    }

    // Stop audio
    if (this.soundObject) {
      try {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
      } catch (err) {
        console.warn('Error unloading alarm sound:', err);
      } finally {
        this.soundObject = null;
      }
    }
  }

  isPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const soundManager = new SoundManager();
