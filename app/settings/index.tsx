import { theme } from '@/constants/theme';
import { getUserEntitlements } from '@/lib/entitlements';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function SettingsScreen() {
    const { logout, user } = useAuthStore();
    const { isVerifiedArtist, isAdmin } = getUserEntitlements(user);
    const isArtistType = user?.type === 'artist';

    const [highQualityAudio, setHighQualityAudio] = useState(true);
    const [dataSaver, setDataSaver] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
    };

    const clearCache = () => {
        Alert.alert(
            "Clear Cache",
            "This will remove temporary files like images and song segments. Your downloads will not be affected.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => {
                        Toast.show({
                            type: 'success',
                            text1: 'Cache Cleared',
                            text2: 'Freed 124MB of space'
                        });
                    }
                }
            ]
        );
    };

    const SettingSection = ({ title, icon, children }: { title: string, icon: keyof typeof Ionicons.glyphMap, children: React.ReactNode }) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    const SettingRow = ({
        icon,
        label,
        value,
        onPress,
        type = 'link',
        iconColor,
    }: {
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        value?: string | boolean,
        onPress?: () => void,
        type?: 'link' | 'toggle' | 'info',
        iconColor?: string,
    }) => (
        <TouchableOpacity
            style={styles.row}
            onPress={type === 'toggle' ? onPress : onPress}
            disabled={type === 'info'}
            activeOpacity={type === 'info' ? 1 : 0.6}
        >
            <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, iconColor ? { backgroundColor: `${iconColor}15` } : null]}>
                    <Ionicons name={icon} size={18} color={iconColor || theme.colors.textSecondary} />
                </View>
                <Text style={styles.rowLabel}>{label}</Text>
            </View>

            <View style={styles.rowRight}>
                {type === 'link' && (
                    <>
                        {value && <Text style={styles.rowValue}>{value}</Text>}
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    </>
                )}

                {type === 'toggle' && (
                    <Switch
                        value={value as boolean}
                        onValueChange={onPress}
                        trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.primary }}
                        thumbColor={theme.colors.textPrimary}
                        ios_backgroundColor={theme.colors.surfaceElevated}
                    />
                )}

                {type === 'info' && (
                    <Text style={styles.rowValue}>{value as string}</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <LinearGradient
                colors={['rgba(108,134,168,0.08)', 'transparent']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Account Section */}
                <SettingSection title="Account" icon="person-outline">
                    <SettingRow
                        icon="mail-outline"
                        label="Email"
                        value={user?.email}
                        type="info"
                    />
                    {!isAdmin && (
                        <SettingRow
                            icon="card-outline"
                            label="Subscription"
                            value="Free"
                            iconColor="#6c86a8"
                            onPress={() => router.push('/settings/subscription' as any)}
                        />
                    )}
                    {isArtistType && (
                        <SettingRow
                            icon="shield-checkmark-outline"
                            label="Artist Verification"
                            value={isVerifiedArtist ? 'Verified' : 'Not verified'}
                            iconColor={isVerifiedArtist ? '#10B981' : '#F59E0B'}
                            onPress={() => router.push('/settings/verification' as any)}
                        />
                    )}
                </SettingSection>

                {/* Audio Quality */}
                {!isAdmin && (
                    <SettingSection title="Audio" icon="musical-notes-outline">
                        <SettingRow
                            icon="wifi-outline"
                            label="High Quality (WiFi)"
                            type="toggle"
                            value={highQualityAudio}
                            onPress={() => setHighQualityAudio(!highQualityAudio)}
                        />
                        <SettingRow
                            icon="cellular-outline"
                            label="Data Saver (Cellular)"
                            type="toggle"
                            value={dataSaver}
                            onPress={() => setDataSaver(!dataSaver)}
                        />
                    </SettingSection>
                )}

                {/* Appearance */}
                <SettingSection title="Appearance" icon="color-palette-outline">
                    <SettingRow
                        icon="apps-outline"
                        label="App Icon"
                        value="Default"
                        iconColor="#8B5CF6"
                        onPress={() => router.push('/settings/app-icon' as any)}
                    />
                </SettingSection>

                {/* Storage */}
                <SettingSection title="Storage" icon="folder-outline">
                    <SettingRow
                        icon="trash-bin-outline"
                        label="Clear Cache"
                        onPress={clearCache}
                        value="124 MB"
                        iconColor={theme.colors.error}
                    />
                </SettingSection>

                {/* Support */}
                <SettingSection title="Support" icon="help-buoy-outline">
                    <SettingRow
                        icon="chatbubble-ellipses-outline"
                        label="Help & Support"
                        iconColor="#6c86a8"
                        onPress={() => router.push('/settings/support' as any)}
                    />
                </SettingSection>

                {/* About & Legal */}
                <SettingSection title="Legal" icon="document-text-outline">
                    <SettingRow
                        icon="document-text-outline"
                        label="Terms of Service"
                        onPress={() => router.push({ pathname: '/settings/legal', params: { type: 'terms' } } as any)}
                    />
                    <SettingRow
                        icon="shield-outline"
                        label="Privacy Policy"
                        onPress={() => router.push({ pathname: '/settings/legal', params: { type: 'privacy' } } as any)}
                    />
                    <SettingRow
                        icon="information-circle-outline"
                        label="Version"
                        value="1.0.0 (Build 42)"
                        type="info"
                    />
                </SettingSection>

                {/* Email Change Notice */}
                <View style={styles.emailNotice}>
                    <Ionicons name="mail-outline" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.emailNoticeText}>
                        To change your email, please contact{' '}
                        <Text
                            style={styles.emailLink}
                            onPress={() => Linking.openURL('mailto:support@palletium.com')}
                        >
                            support@palletium.com
                        </Text>
                    </Text>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.copyright}>{'\u00A9'} 2026 Palletium Inc.</Text>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    content: {
        padding: theme.spacing.md,
        paddingBottom: 40,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: theme.spacing.sm,
        marginLeft: theme.spacing.xs,
    },
    sectionTitle: {
        fontSize: theme.fontSize.xs,
        fontWeight: '600',
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(192,200,214,0.04)',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flex: 1,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(192,200,214,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textPrimary,
    },
    rowValue: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        maxWidth: 180,
    },
    emailNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    emailNoticeText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        lineHeight: 20,
    },
    emailLink: {
        color: theme.colors.primary,
        textDecorationLine: 'underline',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        backgroundColor: 'rgba(248,113,113,0.08)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.15)',
        gap: theme.spacing.sm,
    },
    logoutText: {
        color: theme.colors.error,
        fontWeight: '600',
        fontSize: theme.fontSize.md,
    },
    copyright: {
        textAlign: 'center',
        marginTop: theme.spacing.xl,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
});
