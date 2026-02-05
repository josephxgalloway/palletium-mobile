import { theme } from '@/constants/theme';
import { getUserEntitlements } from '@/lib/entitlements';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function SettingsScreen() {
    const { logout, user } = useAuthStore();
    const { isVerifiedArtist } = getUserEntitlements(user);
    const isArtistType = user?.type === 'artist';

    // Local state for toggles (mocked for now)
    const [highQualityAudio, setHighQualityAudio] = useState(true);
    const [dataSaver, setDataSaver] = useState(false);
    const [downloadCellular, setDownloadCellular] = useState(false);

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

    const SettingSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
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
        type = 'link'
    }: {
        icon: any,
        label: string,
        value?: string | boolean,
        onPress?: () => void,
        type?: 'link' | 'toggle' | 'info'
    }) => (
        <TouchableOpacity
            style={styles.row}
            onPress={type === 'toggle' ? onPress : onPress}
            disabled={type === 'info'}
            activeOpacity={type === 'info' ? 1 : 0.7}
        >
            <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
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

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Account Section */}
                <SettingSection title="Account">
                    <SettingRow
                        icon="person-outline"
                        label="Email"
                        value={user?.email}
                        type="info"
                    />
                    <SettingRow
                        icon="card-outline"
                        label="Subscription"
                        value="Free"
                        onPress={() => router.push('/settings/subscription' as any)}
                    />
                    {isArtistType && (
                        <SettingRow
                            icon="shield-checkmark-outline"
                            label="Artist Verification"
                            value={isVerifiedArtist ? 'Verified' : 'Not verified'}
                            onPress={() => router.push('/settings/verification' as any)}
                        />
                    )}
                </SettingSection>

                {/* Audio Quality */}
                <SettingSection title="Audio Quality">
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

                {/* Cache & Storage */}
                <SettingSection title="Storage">
                    <SettingRow
                        icon="trash-bin-outline"
                        label="Clear Cache"
                        onPress={clearCache}
                        value="124 MB"
                    />
                </SettingSection>

                {/* About & Legal */}
                <SettingSection title="About">
                    <SettingRow
                        icon="document-text-outline"
                        label="Terms of Service"
                        onPress={() => router.push({ pathname: '/settings/legal', params: { type: 'terms' } } as any)}
                    />
                    <SettingRow
                        icon="shield-checkmark-outline"
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

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.copyright}>© 2026 Palletium Inc.</Text>

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
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    content: {
        padding: theme.spacing.md,
        paddingBottom: 40,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.sm,
        marginLeft: theme.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceElevated,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 32,
        alignItems: 'center',
    },
    rowLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textPrimary,
    },
    rowValue: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    logoutButton: {
        marginTop: theme.spacing.lg,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    logoutText: {
        color: theme.colors.error,
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
    },
    copyright: {
        textAlign: 'center',
        marginTop: theme.spacing.xl,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
});
