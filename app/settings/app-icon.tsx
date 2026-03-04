import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

// Lazy load — native module not available in Expo Go
let AlternateIcons: any = null;
let isAlternateIconsAvailable = false;
try {
    AlternateIcons = require('expo-alternate-app-icons');
    isAlternateIconsAvailable = true;
} catch {
    console.warn('expo-alternate-app-icons not available');
}
import { useEffect, useState } from 'react';
import {
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface IconOption {
    name: string | null; // null = default icon
    label: string;
    description: string;
    preview: any; // require() source
    bgColor: string;
}

const ICON_OPTIONS: IconOption[] = [
    {
        name: null,
        label: 'Default',
        description: 'Classic black & white',
        preview: require('../../assets/icons/default.png'),
        bgColor: '#000000',
    },
    {
        name: 'Silver',
        label: 'Silver',
        description: 'Palladium metallic',
        preview: require('../../assets/icons/silver.png'),
        bgColor: '#2d2d3d',
    },
    {
        name: 'Midnight',
        label: 'Midnight',
        description: 'Deep navy',
        preview: require('../../assets/icons/midnight.png'),
        bgColor: '#1a1a2e',
    },
    {
        name: 'Inverted',
        label: 'Inverted',
        description: 'Light mode',
        preview: require('../../assets/icons/inverted.png'),
        bgColor: '#f0f0f0',
    },
];

export default function AppIconScreen() {
    const [activeIcon, setActiveIcon] = useState<string | null>(null);
    const [changing, setChanging] = useState(false);
    const supported = isAlternateIconsAvailable && AlternateIcons?.supportsAlternateIcons;

    useEffect(() => {
        if (supported) {
            const current = AlternateIcons.getAppIconName();
            setActiveIcon(current);
        }
    }, [supported]);

    const handleSelectIcon = async (icon: IconOption) => {
        if (changing) return;

        // Already selected
        const currentName = AlternateIcons?.getAppIconName();
        if (icon.name === currentName) return;

        setChanging(true);
        try {
            if (icon.name === null) {
                await AlternateIcons?.resetAppIcon();
            } else {
                await AlternateIcons?.setAlternateAppIcon(icon.name);
            }
            setActiveIcon(icon.name);
            Toast.show({
                type: 'success',
                text1: 'Icon Changed',
                text2: `Switched to ${icon.label}`,
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Failed to change icon',
                text2: Platform.OS === 'android' ? 'Requires Android 13+' : 'Please try again',
            });
        } finally {
            setChanging(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>App Icon</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.subtitle}>
                    Choose how Palletium appears on your home screen
                </Text>

                {!supported && (
                    <View style={styles.unsupportedBanner}>
                        <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
                        <Text style={styles.unsupportedText}>
                            {Platform.OS === 'android'
                                ? 'Alternate icons require Android 13 or later.'
                                : 'Alternate icons are not available on this device.'}
                        </Text>
                    </View>
                )}

                <View style={styles.grid}>
                    {ICON_OPTIONS.map((icon) => {
                        const isActive = icon.name === activeIcon;
                        return (
                            <Pressable
                                key={icon.label}
                                style={[styles.iconCard, isActive && styles.iconCardActive]}
                                onPress={() => handleSelectIcon(icon)}
                                disabled={changing || !supported}
                            >
                                <View style={[styles.iconPreview, { backgroundColor: icon.bgColor }]}>
                                    <Image
                                        source={icon.preview}
                                        style={styles.iconImage}
                                    />
                                    {isActive && (
                                        <View style={styles.checkBadge}>
                                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.iconLabel, isActive && styles.iconLabelActive]}>
                                    {icon.label}
                                </Text>
                                <Text style={styles.iconDescription}>{icon.description}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.note}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.noteText}>
                        {Platform.OS === 'ios'
                            ? 'iOS may briefly show a notification when changing icons.'
                            : 'Requires Android 13 or later. Your launcher may take a moment to update.'}
                    </Text>
                </View>
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
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    iconCard: {
        width: '45%',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconCardActive: {
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}10`,
    },
    iconPreview: {
        width: 80,
        height: 80,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        position: 'relative',
    },
    iconImage: {
        width: 80,
        height: 80,
    },
    checkBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
    },
    iconLabel: {
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    iconLabelActive: {
        color: theme.colors.primary,
    },
    iconDescription: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
    },
    unsupportedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
    },
    unsupportedText: {
        fontSize: theme.fontSize.xs,
        color: '#F59E0B',
        flex: 1,
        lineHeight: 18,
    },
    note: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 24,
        paddingHorizontal: 12,
    },
    noteText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        flex: 1,
        lineHeight: 18,
    },
});
