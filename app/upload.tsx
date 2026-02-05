import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { getUserEntitlements } from '@/lib/entitlements';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Lazy load DocumentPicker - not available in Expo Go
let DocumentPicker: any = null;
let isDocumentPickerAvailable = false;
try {
  DocumentPicker = require('expo-document-picker');
  isDocumentPickerAvailable = true;
} catch (e) {
  console.warn('DocumentPicker not available - running in Expo Go');
}

type UploadType = 'single' | 'album';
type SingleStep = 'type' | 'audio' | 'metadata' | 'artwork' | 'rights' | 'uploading';
type AlbumStep = 'type' | 'tracks' | 'album-info' | 'artwork' | 'track-details' | 'rights' | 'uploading';
type Step = SingleStep | AlbumStep;

const GENRES = [
  'Hip Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Reggae', 'Latin', 'Metal', 'Punk', 'Folk', 'Indie',
  'Soul', 'Funk', 'Blues', 'Gospel', 'World', 'Ambient', 'Other'
];

const CONTENT_TYPES = [
  { id: 'original', label: 'Original Work', description: 'I created this entirely myself' },
  { id: 'contains_samples', label: 'Contains Samples', description: 'Uses samples from other works' },
  { id: 'cover', label: 'Cover Song', description: 'A cover of another artist\'s song' },
  { id: 'remix', label: 'Remix', description: 'A remix of an existing track' },
];

interface AudioFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

interface AlbumTrack extends AudioFile {
  title: string;
  trackNumber: number;
}

export default function UploadScreen() {
  const { user } = useAuthStore();

  // Upload type
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [step, setStep] = useState<Step>('type');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadTrack, setCurrentUploadTrack] = useState(0);
  const [totalUploadTracks, setTotalUploadTracks] = useState(1);

  // Single track state
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [title, setTitle] = useState('');

  // Album state
  const [albumTracks, setAlbumTracks] = useState<AlbumTrack[]>([]);
  const [albumTitle, setAlbumTitle] = useState('');

  // Shared state
  const [genre, setGenre] = useState('');
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [artwork, setArtwork] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [contentType, setContentType] = useState<string>('original');
  const [acknowledgeRights, setAcknowledgeRights] = useState(false);
  const [acknowledgeIndemnification, setAcknowledgeIndemnification] = useState(false);

  const { isVerifiedArtist, canUploadMusic } = getUserEntitlements(user);

  const getSingleSteps = (): SingleStep[] => ['type', 'audio', 'metadata', 'artwork', 'rights'];
  const getAlbumSteps = (): AlbumStep[] => ['type', 'tracks', 'album-info', 'artwork', 'track-details', 'rights'];

  const getCurrentSteps = () => uploadType === 'album' ? getAlbumSteps() : getSingleSteps();
  const getCurrentStepIndex = () => getCurrentSteps().indexOf(step as any);

  const pickAudioFile = async (multiple = false) => {
    if (!isDocumentPickerAvailable || !DocumentPicker) {
      Alert.alert(
        'Feature Unavailable',
        'Audio file selection requires a development build of the app. Please use the web platform at palletium.com to upload tracks.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Web', onPress: () => Linking.openURL('https://palletium.com/upload') }
        ]
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'],
        copyToCacheDirectory: true,
        multiple: multiple,
      });

      if (!result.canceled && result.assets) {
        if (multiple) {
          // Album mode - multiple files
          const validFiles: AlbumTrack[] = [];
          for (let i = 0; i < result.assets.length; i++) {
            const file = result.assets[i];
            if (file.size && file.size > 100 * 1024 * 1024) {
              Alert.alert('File Too Large', `${file.name} exceeds 100MB limit`);
              continue;
            }
            validFiles.push({
              uri: file.uri,
              name: file.name || `track_${i + 1}.wav`,
              size: file.size,
              mimeType: file.mimeType,
              title: file.name?.replace(/\.(wav|flac)$/i, '') || `Track ${i + 1}`,
              trackNumber: albumTracks.length + i + 1,
            });
          }
          setAlbumTracks([...albumTracks, ...validFiles]);
        } else {
          // Single track mode
          const file = result.assets[0];
          if (file.size && file.size > 100 * 1024 * 1024) {
            Alert.alert('File Too Large', 'Maximum file size is 100MB');
            return;
          }
          setAudioFile({
            uri: file.uri,
            name: file.name || 'track.wav',
            size: file.size,
            mimeType: file.mimeType,
          });
        }
      }
    } catch (error: any) {
      console.error('Error picking audio:', error);
      if (error.message?.includes('native module') || error.message?.includes('ExpoDocumentPicker')) {
        Alert.alert(
          'Feature Unavailable',
          'Audio file selection requires a development build of the app. Please use the web platform at palletium.com to upload tracks.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Web', onPress: () => Linking.openURL('https://palletium.com/upload') }
          ]
        );
      } else {
        Toast.show({ type: 'error', text1: 'Failed to select audio file' });
      }
    }
  };

  const pickArtwork = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as const,
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setArtwork(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking artwork:', error);
      Toast.show({ type: 'error', text1: 'Failed to select artwork' });
    }
  };

  const removeTrack = (index: number) => {
    const newTracks = albumTracks.filter((_, i) => i !== index);
    // Update track numbers
    newTracks.forEach((track, i) => {
      track.trackNumber = i + 1;
    });
    setAlbumTracks(newTracks);
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === albumTracks.length - 1)
    ) return;

    const newTracks = [...albumTracks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTracks[index], newTracks[swapIndex]] = [newTracks[swapIndex], newTracks[index]];

    // Update track numbers
    newTracks.forEach((track, i) => {
      track.trackNumber = i + 1;
    });
    setAlbumTracks(newTracks);
  };

  const updateTrackTitle = (index: number, newTitle: string) => {
    const newTracks = [...albumTracks];
    newTracks[index].title = newTitle;
    setAlbumTracks(newTracks);
  };

  const handleSingleUpload = async () => {
    if (!audioFile || !artwork || !title || !genre) {
      Toast.show({ type: 'error', text1: 'Please complete all required fields' });
      return;
    }

    setStep('uploading');
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioFile.uri,
        type: audioFile.mimeType || 'audio/wav',
        name: audioFile.name || 'track.wav',
      } as any);

      const artworkFilename = artwork.uri.split('/').pop() || 'artwork.jpg';
      const artworkType = artworkFilename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      formData.append('artwork', {
        uri: artwork.uri,
        type: artworkType,
        name: artworkFilename,
      } as any);

      formData.append('title', title);
      formData.append('genre', genre);
      formData.append('releaseDate', releaseDate);
      formData.append('contentType', contentType);
      formData.append('generateIsrc', 'true');
      formData.append('rightsAcknowledgments', JSON.stringify({
        acknowledgeRights,
        acknowledgeIndemnification,
        contentType,
      }));

      await uploadWithProgress(formData, '/tracks/upload');

      Toast.show({
        type: 'success',
        text1: 'Track uploaded!',
        text2: 'Your track is now pending review',
      });

      router.replace('/(tabs)/studio');
    } catch (error: any) {
      console.error('Upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: error.message || 'Please try again',
      });
      setStep('rights');
    } finally {
      setUploading(false);
    }
  };

  const handleAlbumUpload = async () => {
    if (albumTracks.length === 0 || !artwork || !albumTitle || !genre) {
      Toast.show({ type: 'error', text1: 'Please complete all required fields' });
      return;
    }

    setStep('uploading');
    setUploading(true);
    setUploadProgress(0);
    setTotalUploadTracks(albumTracks.length);

    try {
      // First, create the album
      const albumFormData = new FormData();
      albumFormData.append('title', albumTitle);
      albumFormData.append('genre', genre);
      albumFormData.append('releaseDate', releaseDate);
      albumFormData.append('trackCount', albumTracks.length.toString());

      const artworkFilename = artwork.uri.split('/').pop() || 'artwork.jpg';
      const artworkType = artworkFilename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      albumFormData.append('artwork', {
        uri: artwork.uri,
        type: artworkType,
        name: artworkFilename,
      } as any);

      const albumResponse = await uploadWithProgress(albumFormData, '/albums/create');
      const albumId = albumResponse.album?.id || albumResponse.id;

      // Then upload each track
      for (let i = 0; i < albumTracks.length; i++) {
        setCurrentUploadTrack(i + 1);
        const track = albumTracks[i];

        const trackFormData = new FormData();
        trackFormData.append('audio', {
          uri: track.uri,
          type: track.mimeType || 'audio/wav',
          name: track.name || `track_${i + 1}.wav`,
        } as any);
        trackFormData.append('title', track.title);
        trackFormData.append('trackNumber', track.trackNumber.toString());
        trackFormData.append('albumId', albumId.toString());
        trackFormData.append('genre', genre);
        trackFormData.append('contentType', contentType);
        trackFormData.append('generateIsrc', 'true');
        trackFormData.append('rightsAcknowledgments', JSON.stringify({
          acknowledgeRights,
          acknowledgeIndemnification,
          contentType,
        }));

        await uploadWithProgress(trackFormData, '/tracks/upload');
      }

      Toast.show({
        type: 'success',
        text1: 'Album uploaded!',
        text2: `${albumTracks.length} tracks pending review`,
      });

      router.replace('/(tabs)/studio');
    } catch (error: any) {
      console.error('Album upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: error.message || 'Please try again',
      });
      setStep('rights');
    } finally {
      setUploading(false);
    }
  };

  const uploadWithProgress = (formData: FormData, endpoint: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            // Parse structured error from backend
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || errorData.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', `${api.defaults.baseURL}${endpoint}`);

        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      } catch (err) {
        reject(err);
      }
    });
  };

  const canProceed = () => {
    switch (step) {
      case 'type':
        return uploadType !== null;
      case 'audio':
        return !!audioFile;
      case 'tracks':
        return albumTracks.length > 0;
      case 'metadata':
        return title.length > 0 && genre.length > 0;
      case 'album-info':
        return albumTitle.length > 0 && genre.length > 0;
      case 'artwork':
        return !!artwork;
      case 'track-details':
        return albumTracks.every(t => t.title.length > 0);
      case 'rights':
        return acknowledgeRights && acknowledgeIndemnification;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps = getCurrentSteps();
    const currentIndex = getCurrentStepIndex();

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else if (step === 'rights') {
      if (uploadType === 'album') {
        handleAlbumUpload();
      } else {
        handleSingleUpload();
      }
    }
  };

  const prevStep = () => {
    const steps = getCurrentSteps();
    const currentIndex = getCurrentStepIndex();

    if (currentIndex > 0) {
      const prevStepValue = steps[currentIndex - 1];
      if (prevStepValue === 'type') {
        // Reset upload type when going back to type selection
        setUploadType(null);
      }
      setStep(prevStepValue);
    }
  };

  const selectUploadType = (type: UploadType) => {
    setUploadType(type);
    if (type === 'single') {
      setStep('audio');
    } else {
      setStep('tracks');
    }
  };

  // Not authenticated
  if (!canUploadMusic) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Upload Music', headerShown: true }} />
        <View style={styles.center}>
          <Ionicons name="cloud-upload-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Sign in to upload</Text>
          <Text style={styles.emptySubtext}>Create an account to start sharing your music</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Uploading screen
  if (step === 'uploading') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Uploading', headerShown: true, headerBackVisible: false }} />
        <View style={styles.center}>
          <View style={styles.uploadingIcon}>
            <Ionicons name="cloud-upload" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.uploadingTitle}>
            {uploadType === 'album' ? 'Uploading Album' : 'Uploading Track'}
          </Text>
          {uploadType === 'album' && (
            <Text style={styles.uploadingTrackCount}>
              Track {currentUploadTrack} of {totalUploadTracks}
            </Text>
          )}
          <Text style={styles.uploadingSubtitle}>{uploadProgress}% complete</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.uploadingHint}>Please wait, this may take a moment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderStepIndicator = () => {
    const steps = getCurrentSteps().filter(s => s !== 'type');
    const currentIndex = Math.max(0, getCurrentStepIndex() - 1); // Adjust for 'type' step

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View key={s} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                currentIndex === i && styles.stepDotActive,
                currentIndex > i && styles.stepDotComplete,
              ]}
            >
              {currentIndex > i ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={styles.stepNumber}>{i + 1}</Text>
              )}
            </View>
            {i < steps.length - 1 && <View style={styles.stepLine} />}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: step === 'type' ? 'Upload' : uploadType === 'album' ? 'Upload Album' : 'Upload Track',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {step !== 'type' && renderStepIndicator()}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Type Selection */}
          {step === 'type' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>What are you uploading?</Text>
              <Text style={styles.stepSubtitle}>Choose your upload type</Text>

              {!isVerifiedArtist && (
                <View style={styles.unverifiedCallout}>
                  <View style={styles.unverifiedHeader}>
                    <Ionicons name="alert-circle" size={20} color="#92400e" />
                    <Text style={styles.unverifiedTitle}>Unverified Artist Limits</Text>
                  </View>
                  <Text style={styles.unverifiedItem}>• 3 total tracks max</Text>
                  <Text style={styles.unverifiedItem}>• Uploads pending review — not discoverable until approved</Text>
                  <Text style={styles.unverifiedItem}>• Earns $0.004/play on approved tracks</Text>
                  <TouchableOpacity onPress={() => router.push('/settings/verification' as any)}>
                    <Text style={styles.unverifiedLink}>Get verified →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!isDocumentPickerAvailable ? (
                <View style={styles.unavailableBox}>
                  <Ionicons name="desktop-outline" size={48} color={theme.colors.primary} />
                  <Text style={styles.unavailableTitle}>Use Web Platform</Text>
                  <Text style={styles.unavailableText}>
                    Track uploads require the full Palletium app. For now, please use the web platform to upload your music.
                  </Text>
                  <TouchableOpacity
                    style={styles.webButton}
                    onPress={() => Linking.openURL('https://palletium.com/upload')}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, '#8B6914'] as const}
                      style={styles.webButtonGradient}
                    >
                      <Ionicons name="globe-outline" size={20} color="#fff" />
                      <Text style={styles.webButtonText}>Open palletium.com</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.typeOptions}>
                  <TouchableOpacity
                    style={styles.typeCard}
                    onPress={() => selectUploadType('single')}
                  >
                    <View style={styles.typeIconContainer}>
                      <Ionicons name="musical-note" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.typeTitle}>Single Track</Text>
                    <Text style={styles.typeDescription}>Upload one song at a time</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.typeCard}
                    onPress={() => selectUploadType('album')}
                  >
                    <View style={styles.typeIconContainer}>
                      <Ionicons name="albums" size={32} color={theme.colors.accent} />
                    </View>
                    <Text style={styles.typeTitle}>Album / EP</Text>
                    <Text style={styles.typeDescription}>Upload multiple tracks together</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Single Track: Audio Selection */}
          {step === 'audio' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Audio File</Text>
              <Text style={styles.stepSubtitle}>WAV or FLAC format, max 100MB</Text>

              <TouchableOpacity style={styles.filePickerBox} onPress={() => pickAudioFile(false)}>
                {audioFile ? (
                  <View style={styles.fileSelected}>
                    <Ionicons name="musical-notes" size={32} color={theme.colors.success} />
                    <Text style={styles.fileName} numberOfLines={1}>{audioFile.name}</Text>
                    <Text style={styles.fileSize}>
                      {((audioFile.size || 0) / (1024 * 1024)).toFixed(1)} MB
                    </Text>
                  </View>
                ) : (
                  <View style={styles.filePlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.filePlaceholderText}>Tap to select audio file</Text>
                    <Text style={styles.filePlaceholderHint}>WAV or FLAC only</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                  For best quality, upload WAV files at 44.1kHz, 16-24 bit
                </Text>
              </View>
            </View>
          )}

          {/* Album: Track Selection */}
          {step === 'tracks' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add Tracks</Text>
              <Text style={styles.stepSubtitle}>Select audio files for your album</Text>

              <TouchableOpacity style={styles.addTracksButton} onPress={() => pickAudioFile(true)}>
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.addTracksText}>Add Audio Files</Text>
              </TouchableOpacity>

              {albumTracks.length > 0 && (
                <View style={styles.trackList}>
                  {albumTracks.map((track, index) => (
                    <View key={`${track.uri}-${index}`} style={styles.trackItem}>
                      <View style={styles.trackNumber}>
                        <Text style={styles.trackNumberText}>{track.trackNumber}</Text>
                      </View>
                      <View style={styles.trackItemInfo}>
                        <Text style={styles.trackItemName} numberOfLines={1}>{track.name}</Text>
                        <Text style={styles.trackItemSize}>
                          {((track.size || 0) / (1024 * 1024)).toFixed(1)} MB
                        </Text>
                      </View>
                      <View style={styles.trackItemActions}>
                        <TouchableOpacity onPress={() => moveTrack(index, 'up')} disabled={index === 0}>
                          <Ionicons
                            name="chevron-up"
                            size={20}
                            color={index === 0 ? theme.colors.border : theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moveTrack(index, 'down')} disabled={index === albumTracks.length - 1}>
                          <Ionicons
                            name="chevron-down"
                            size={20}
                            color={index === albumTracks.length - 1 ? theme.colors.border : theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeTrack(index)}>
                          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                  {albumTracks.length} track{albumTracks.length !== 1 ? 's' : ''} added. Drag to reorder.
                </Text>
              </View>
            </View>
          )}

          {/* Single Track: Metadata */}
          {step === 'metadata' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Track Details</Text>
              <Text style={styles.stepSubtitle}>Add information about your track</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter track title"
                  placeholderTextColor={theme.colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Genre *</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowGenrePicker(!showGenrePicker)}
                >
                  <Text style={genre ? styles.selectText : styles.selectPlaceholder}>
                    {genre || 'Select genre'}
                  </Text>
                  <Ionicons
                    name={showGenrePicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
                {showGenrePicker && (
                  <ScrollView style={styles.genreList} nestedScrollEnabled>
                    {GENRES.map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genreItem, genre === g && styles.genreItemSelected]}
                        onPress={() => {
                          setGenre(g);
                          setShowGenrePicker(false);
                        }}
                      >
                        <Text style={[styles.genreText, genre === g && styles.genreTextSelected]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Release Date</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                  value={releaseDate}
                  onChangeText={setReleaseDate}
                />
              </View>
            </View>
          )}

          {/* Album: Album Info */}
          {step === 'album-info' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Album Details</Text>
              <Text style={styles.stepSubtitle}>Add information about your album</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Album Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter album title"
                  placeholderTextColor={theme.colors.textMuted}
                  value={albumTitle}
                  onChangeText={setAlbumTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Genre *</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowGenrePicker(!showGenrePicker)}
                >
                  <Text style={genre ? styles.selectText : styles.selectPlaceholder}>
                    {genre || 'Select genre'}
                  </Text>
                  <Ionicons
                    name={showGenrePicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
                {showGenrePicker && (
                  <ScrollView style={styles.genreList} nestedScrollEnabled>
                    {GENRES.map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genreItem, genre === g && styles.genreItemSelected]}
                        onPress={() => {
                          setGenre(g);
                          setShowGenrePicker(false);
                        }}
                      >
                        <Text style={[styles.genreText, genre === g && styles.genreTextSelected]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Release Date</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                  value={releaseDate}
                  onChangeText={setReleaseDate}
                />
              </View>
            </View>
          )}

          {/* Artwork (shared) */}
          {step === 'artwork' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Cover Artwork</Text>
              <Text style={styles.stepSubtitle}>
                {uploadType === 'album' ? 'Add cover art for your album' : 'Add album art for your track'}
              </Text>

              <TouchableOpacity style={styles.artworkPicker} onPress={pickArtwork}>
                {artwork ? (
                  <Image source={{ uri: artwork.uri }} style={styles.artworkPreview} />
                ) : (
                  <View style={styles.artworkPlaceholder}>
                    <Ionicons name="image-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.artworkPlaceholderText}>Tap to select artwork</Text>
                    <Text style={styles.artworkPlaceholderHint}>Square image recommended</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Album: Track Details */}
          {step === 'track-details' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Track Titles</Text>
              <Text style={styles.stepSubtitle}>Edit titles for each track</Text>

              {albumTracks.map((track, index) => (
                <View key={`${track.uri}-${index}`} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Track {track.trackNumber}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter track title"
                    placeholderTextColor={theme.colors.textMuted}
                    value={track.title}
                    onChangeText={(text) => updateTrackTitle(index, text)}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Rights (shared) */}
          {step === 'rights' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Rights & Confirmation</Text>
              <Text style={styles.stepSubtitle}>Confirm ownership and rights</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Content Type</Text>
                {CONTENT_TYPES.map((ct) => (
                  <TouchableOpacity
                    key={ct.id}
                    style={[
                      styles.contentTypeOption,
                      contentType === ct.id && styles.contentTypeSelected,
                    ]}
                    onPress={() => setContentType(ct.id)}
                  >
                    <View style={styles.radioOuter}>
                      {contentType === ct.id && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.contentTypeText}>
                      <Text style={styles.contentTypeLabel}>{ct.label}</Text>
                      <Text style={styles.contentTypeDesc}>{ct.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAcknowledgeRights(!acknowledgeRights)}
                >
                  <View style={[styles.checkbox, acknowledgeRights && styles.checkboxChecked]}>
                    {acknowledgeRights && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I confirm I have the rights to distribute this content
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAcknowledgeIndemnification(!acknowledgeIndemnification)}
                >
                  <View style={[styles.checkbox, acknowledgeIndemnification && styles.checkboxChecked]}>
                    {acknowledgeIndemnification && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I agree to indemnify Palletium against any copyright claims
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Navigation Buttons */}
        {(isDocumentPickerAvailable || step !== 'type') && step !== 'type' && (
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
              onPress={nextStep}
              disabled={!canProceed()}
            >
              <LinearGradient
                colors={canProceed() ? [theme.colors.primary, '#8B6914'] as const : ['#555', '#444'] as const}
                style={styles.nextBtnGradient}
              >
                <Text style={styles.nextBtnText}>
                  {step === 'rights' ? (uploadType === 'album' ? 'Upload Album' : 'Upload Track') : 'Continue'}
                </Text>
                <Ionicons
                  name={step === 'rights' ? 'cloud-upload' : 'arrow-forward'}
                  size={20}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerButton: {
    padding: theme.spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  // Listener transition screen
  transitionContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingTop: 60,
  },
  transitionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  transitionSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  transitionNote: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    lineHeight: 20,
    paddingHorizontal: theme.spacing.md,
  },
  verifiedCallout: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    width: '100%',
  },
  uploadingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  uploadingTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  uploadingTrackCount: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  uploadingSubtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    marginTop: theme.spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  uploadingHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepDotComplete: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  stepNumber: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: theme.colors.border,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  stepSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  // Type selection
  typeOptions: {
    gap: theme.spacing.md,
  },
  typeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  typeTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  typeDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  // File picker
  filePickerBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  filePlaceholder: {
    alignItems: 'center',
  },
  filePlaceholderText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  filePlaceholderHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  fileSelected: {
    alignItems: 'center',
  },
  fileName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  // Track list for albums
  addTracksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    gap: theme.spacing.sm,
  },
  addTracksText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  trackList: {
    marginTop: theme.spacing.lg,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trackNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  trackNumberText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  trackItemInfo: {
    flex: 1,
  },
  trackItemName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  trackItemSize: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  trackItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
  // Unavailable box
  unavailableBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unavailableTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  unavailableText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  webButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    width: '100%',
  },
  webButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  webButtonText: {
    fontSize: theme.fontSize.md,
    color: '#fff',
    fontWeight: '600',
  },
  // Form inputs
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  selectPlaceholder: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  genreList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  genreItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  genreItemSelected: {
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
  },
  genreText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  genreTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Artwork
  artworkPicker: {
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  artworkPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkPlaceholderText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  artworkPlaceholderHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  artworkPreview: {
    width: '100%',
    height: '100%',
  },
  // Content type
  contentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contentTypeSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  contentTypeText: {
    flex: 1,
  },
  contentTypeLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  contentTypeDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  // Checkboxes
  checkboxGroup: {
    marginTop: theme.spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  // Unverified callout
  unverifiedCallout: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  unverifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  unverifiedTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: '#92400e',
  },
  unverifiedItem: {
    fontSize: theme.fontSize.sm,
    color: '#92400e',
    lineHeight: 20,
    marginLeft: theme.spacing.sm,
  },
  unverifiedLink: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  // Navigation
  navButtons: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  backBtnText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  nextBtn: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  nextBtnText: {
    fontSize: theme.fontSize.md,
    color: '#fff',
    fontWeight: '600',
  },
});
