# Palletium - App Store Metadata

## App Name
Palletium - Music That Pays

## Subtitle (30 chars)
Fair Pay Music Streaming

## Description
Palletium is the music streaming platform that pays artists what they deserve.

**For Artists:**
- Verified artists earn $1.00 per first listen from subscribed listeners (200x more than Spotify)
- Earn $0.01 for every repeat listen
- Track your earnings in real-time
- Connect directly with your fans

**For Listeners:**
- Discover new music and earn rewards
- Support artists with every play
- Build your tier from Bronze to Diamond
- Earn more as you listen more

Join the music revolution. Stream music. Support artists. Earn rewards.

## Keywords
music, streaming, artist, earn, fair pay, discover, playlist, rewards, independent music

## Categories
- Primary: Music
- Secondary: Entertainment

## Age Rating
4+ (No objectionable content)

## Privacy Policy URL
https://palletium.com/privacy

## Support URL
https://palletium.com/support

## Marketing URL
https://palletium.com

## Screenshots Needed
1. Discover screen showing tracks
2. Full player screen
3. Profile screen with stats
4. Search screen with results
5. Library screen with playlists

## App Preview Video (Optional)
30-second demo showing:
- Browsing music
- Playing a track
- Payment toast appearing
- Profile stats updating

## Version History

### 1.0.0 (Initial Release)
- Music discovery and streaming
- Background audio playback
- Lock screen controls
- Artist/Listener profiles
- Play tracking with payment notifications
- Search functionality
- Library with playlists and history
- Offline detection
- Dark Palladium theme

## Technical Requirements

### iOS
- iOS 13.0+
- iPhone and iPad
- Background audio capability

### Android
- Android 6.0+
- Background audio capability
- Foreground service for playback

## Build Information

### Development Build
```bash
npx expo prebuild --clean
npx expo run:ios
```

### Production Build (EAS)
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Submit to App Store
```bash
eas submit --platform ios
eas submit --platform android
```

## Pre-submission Checklist

- [ ] App icons (1024x1024 PNG)
- [ ] Splash screen
- [ ] Screenshots (6.5", 5.5" iPhone, iPad)
- [ ] Privacy policy URL live
- [ ] Support URL live
- [ ] Terms of service URL
- [ ] App Store Connect account
- [ ] Google Play Console account
- [ ] EAS project ID configured
- [ ] Test on real devices
- [ ] Beta testing complete
