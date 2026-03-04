import { theme } from '@/constants/theme';
import { getArtistFollowers, getUserFollowing } from '@/lib/api/client';
import type { FollowUser } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type ModalMode = 'followers' | 'following';

interface SupportersModalProps {
  visible: boolean;
  onClose: () => void;
  artistId: number;
  artistName: string;
  mode: ModalMode;
}

export default function SupportersModal({
  visible,
  onClose,
  artistId,
  artistName,
  mode,
}: SupportersModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setUsers([]);

    const fetch = async () => {
      try {
        if (mode === 'followers') {
          const data = await getArtistFollowers(artistId, 100);
          setUsers(data.followers || []);
          setTotal(data.total || 0);
        } else {
          const data = await getUserFollowing(artistId, 100);
          setUsers(data.following || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error(`Failed to fetch ${mode}:`, err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [visible, artistId, mode]);

  const handleUserPress = (user: FollowUser) => {
    onClose();
    if (user.type === 'artist') {
      router.push(`/artist/${user.id}` as any);
    } else {
      router.push(`/profile/${user.id}` as any);
    }
  };

  const title = mode === 'followers' ? 'Followers' : 'Following';

  const renderUser = ({ item }: { item: FollowUser }) => (
    <Pressable style={styles.userRow} onPress={() => handleUserPress(item)}>
      {item.profile_image ? (
        <Image source={{ uri: item.profile_image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#000' }]}>
          <Image
            source={require('../assets/images/icon.png')}
            style={{ width: 28, height: 28, borderRadius: 14 }}
          />
        </View>
      )}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          {item.is_verified && (
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.userMeta} numberOfLines={1}>
          {item.type === 'artist' ? 'Artist' : 'Listener'}
          {item.track_count != null ? ` · ${item.track_count} tracks` : ''}
          {item.follower_count != null ? ` · ${item.follower_count} followers` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {mode === 'followers'
                ? `People following ${artistName}`
                : `Artists ${artistName} follows`}
            </Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons
                name={mode === 'followers' ? 'people-outline' : 'heart-outline'}
                size={48}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyText}>
                {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderUser}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    paddingBottom: 40,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
    opacity: 0.4,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    padding: 4,
  },
  list: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  userMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
});
