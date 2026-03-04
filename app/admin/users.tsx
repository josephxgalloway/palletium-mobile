import { theme } from '@/constants/theme';
import { getUsers, blockUser, grantAdmin, revokeAdmin } from '@/lib/api/admin.service';
import type { AdminUser } from '@/lib/api/admin.service';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

export default function UsersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = useCallback(async (p = 1, q = '') => {
    try {
      const res = await getUsers({ page: p, limit: 30, search: q || undefined });
      setUsers(res.users);
      setTotal(res.pagination.total);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1, search);
    setRefreshing(false);
  }, [loadData, search]);

  const handleSearch = () => {
    setLoading(true);
    loadData(1, search);
  };

  const handleBlock = (user: AdminUser) => {
    Alert.prompt(
      'Block User',
      `Block ${user.name || user.email}? Enter a reason:`,
      async (reason) => {
        if (!reason?.trim()) return;
        setActionLoading(user.id);
        try {
          await blockUser(user.id, reason.trim());
          Toast.show({ type: 'success', text1: `${user.name || user.email} blocked` });
          await loadData(page, search);
        } catch {
          Toast.show({ type: 'error', text1: 'Failed to block user' });
        } finally {
          setActionLoading(null);
        }
      },
      'plain-text'
    );
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    const action = user.is_admin ? 'revoke admin from' : 'grant admin to';
    Alert.alert(
      `${user.is_admin ? 'Revoke' : 'Grant'} Admin`,
      `Are you sure you want to ${action} ${user.name || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: user.is_admin ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(user.id);
            try {
              if (user.is_admin) {
                await revokeAdmin(user.id);
              } else {
                await grantAdmin(user.id);
              }
              Toast.show({ type: 'success', text1: `Admin ${user.is_admin ? 'revoked' : 'granted'}` });
              await loadData(page, search);
            } catch {
              Toast.show({ type: 'error', text1: 'Failed to update admin status' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const roleColor = (type: string) => {
    if (type === 'admin') return '#F59E0B';
    if (type === 'artist') return '#10B981';
    return '#60A5FA';
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'User Management' }} />

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchInput}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={s.searchText}
            placeholder="Search by name or email..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setLoading(true); loadData(1, ''); }}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={s.totalText}>{total} users</Text>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {users.map(user => (
            <View key={user.id} style={s.userCard}>
              <View style={s.userHeader}>
                <View style={s.userInfo}>
                  <Text style={s.userName} numberOfLines={1}>{user.name || 'No name'}</Text>
                  <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>
                <View style={[s.roleBadge, { backgroundColor: `${roleColor(user.type)}20` }]}>
                  <Text style={[s.roleText, { color: roleColor(user.type) }]}>{user.type}</Text>
                </View>
              </View>
              <View style={s.userMeta}>
                <Text style={s.metaText}>ID: {user.id}</Text>
                <Text style={s.metaText}>Joined: {new Date(user.created_at).toLocaleDateString()}</Text>
                {user.is_admin && <Text style={[s.metaText, { color: '#F59E0B' }]}>Admin</Text>}
              </View>
              <View style={s.userActions}>
                <TouchableOpacity
                  style={[s.userBtn, { backgroundColor: user.is_admin ? '#F59E0B20' : '#60A5FA20' }]}
                  onPress={() => handleToggleAdmin(user)}
                  disabled={actionLoading === user.id}
                >
                  {actionLoading === user.id ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <>
                      <Ionicons name={user.is_admin ? 'shield' : 'shield-outline'} size={14} color={user.is_admin ? '#F59E0B' : '#60A5FA'} />
                      <Text style={[s.userBtnText, { color: user.is_admin ? '#F59E0B' : '#60A5FA' }]}>
                        {user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.userBtn, { backgroundColor: '#F8717120' }]}
                  onPress={() => handleBlock(user)}
                  disabled={actionLoading === user.id}
                >
                  <Ionicons name="ban" size={14} color="#F87171" />
                  <Text style={[s.userBtnText, { color: '#F87171' }]}>Block</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={s.pagination}>
              <TouchableOpacity
                style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
                onPress={() => { setLoading(true); loadData(page - 1, search); }}
                disabled={page <= 1}
              >
                <Ionicons name="chevron-back" size={18} color={page <= 1 ? theme.colors.textMuted : theme.colors.primary} />
              </TouchableOpacity>
              <Text style={s.pageText}>Page {page} of {totalPages}</Text>
              <TouchableOpacity
                style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
                onPress={() => { setLoading(true); loadData(page + 1, search); }}
                disabled={page >= totalPages}
              >
                <Ionicons name="chevron-forward" size={18} color={page >= totalPages ? theme.colors.textMuted : theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 10, paddingHorizontal: 12, height: 44, gap: 8 },
  searchText: { flex: 1, color: theme.colors.textPrimary, fontSize: 15 },
  totalText: { fontSize: 13, color: theme.colors.textMuted, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  content: { padding: 16, paddingTop: 0, paddingBottom: 80 },
  userCard: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
  userHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  userInfo: { flex: 1, marginRight: 8 },
  userName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  userEmail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  roleText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  userMeta: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaText: { fontSize: 11, color: theme.colors.textMuted },
  userActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  userBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6 },
  userBtnText: { fontSize: 12, fontWeight: '600' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 },
  pageBtn: { padding: 8, backgroundColor: theme.colors.surface, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 13, color: theme.colors.textSecondary },
});
