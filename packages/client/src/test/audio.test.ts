import { describe, test, expect } from 'vitest';
import { getSfxVolume, setSfxVolume, getMusicVolume, setMusicVolume } from '../audio/sound';
import { isMusicOn, startMusic, stopMusic } from '../audio/music';
import { discordAvatarUrl } from '../discord';

// jsdom has no AudioContext — the modules must degrade to pure state + storage.

describe('audio volumes', () => {
  test('setters clamp to [0,1] and persist', () => {
    setSfxVolume(1.7);
    expect(getSfxVolume()).toBe(1);
    setSfxVolume(-2);
    expect(getSfxVolume()).toBe(0);
    setSfxVolume(0.35);
    expect(getSfxVolume()).toBe(0.35);
    expect(localStorage.getItem('muushig:vol:sfx')).toBe('0.35');

    setMusicVolume(0.6);
    expect(getMusicVolume()).toBe(0.6);
    expect(localStorage.getItem('muushig:vol:music')).toBe('0.6');
  });
});

describe('music engine', () => {
  test('start/stop are idempotent and safe without an AudioContext', () => {
    expect(isMusicOn()).toBe(false);
    startMusic(); // no AudioContext in jsdom → stays off, no throw
    startMusic();
    expect(isMusicOn()).toBe(false);
    stopMusic();
    stopMusic();
    expect(isMusicOn()).toBe(false);
  });
});

describe('discordAvatarUrl', () => {
  test('builds png for static hashes and gif for animated', () => {
    expect(discordAvatarUrl('123', 'abcd')).toBe(
      'https://cdn.discordapp.com/avatars/123/abcd.png?size=128',
    );
    expect(discordAvatarUrl('123', 'a_ffff')).toBe(
      'https://cdn.discordapp.com/avatars/123/a_ffff.gif?size=128',
    );
  });

  test('empty for missing user or hash', () => {
    expect(discordAvatarUrl('', 'abcd')).toBe('');
    expect(discordAvatarUrl('123', null)).toBe('');
    expect(discordAvatarUrl('123', undefined)).toBe('');
  });
});
