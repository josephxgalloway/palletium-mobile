import { theme } from '@/constants/theme';
import { LEGAL_DOC_VERSION, LEGAL_DOC_DATE, TERMS_OF_SERVICE, PRIVACY_POLICY } from '@/lib/legal';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LegalScreen() {
    const { type } = useLocalSearchParams();
    const isPrivacy = type === 'privacy';
    const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
    const content = isPrivacy ? PRIVACY_POLICY : TERMS_OF_SERVICE;
    const icon = isPrivacy ? 'shield-outline' : 'document-text-outline';

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
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.versionBadge}>
                <View style={styles.versionInner}>
                    <Ionicons name={icon as any} size={14} color={theme.colors.textMuted} />
                    <Text style={styles.versionText}>
                        Version {LEGAL_DOC_VERSION} | Updated {LEGAL_DOC_DATE}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.text}>{content}</Text>
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
    versionBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    versionInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
    },
    versionText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    text: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
        lineHeight: 24,
    },
});
