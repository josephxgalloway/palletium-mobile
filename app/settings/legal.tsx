import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LegalScreen() {
    const { type } = useLocalSearchParams();
    const title = type === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

    const content = type === 'privacy'
        ? `Privacy Policy
    
Last Updated: January 2026

1. Introduction
Welcome to Palletium ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our music streaming platform.

2. Information We Collect
- Account Information: When you create an account, we collect your email address, username, and password.
- Usage Data: We collect information about how you use Palletium, such as the songs you play, playlists you create, and your interactions with other users.
- Device Information: We collect information about the device you use to access Palletium, including IP address, browser type, and operating system.

3. How We Use Your Information
- To provide and improve our services.
- To personalize your experience.
- To communicate with you about your account and our services.
- To analyze trends and usage.

4. Sharing Your Information
We do not sell your personal information. We may share your information with third-party service providers who assist us in operating our platform, or as required by law.

5. Your Choices
You can manage your account settings and communication preferences within the app. You may also request deletion of your account/data via support.

6. Contact Us
If you have any questions about this Privacy Policy, please contact us at support@palletium.com.`
        : `Terms of Service

Last Updated: January 2026

1. Acceptance of Terms
By accessing or using Palletium, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.

2. Description of Service
Palletium is a music streaming platform that allows artists to upload music and listeners to stream content. We offer both free and paid subscription tiers.

3. User Accounts
You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.

4. User Content
- Artists retain ownership of the music they upload.
- By uploading content, you grant Palletium a license to stream, distribute, and promote your music on our platform.
- You represent and warrant that you own or have the necessary rights to your content.

5. Prohibited Conduct
You agree not to:
- Use the service for any illegal purpose.
- Violate the rights of others, including copyright and intellectual property rights.
- Harass or abuse other users.
- Interfere with the operation of the service.

6. Termination
We reserve the right to suspend or terminate your account at any time for any reason, including violation of these Terms.

7. Disclaimer of Warranties
The service is provided "as is" without warranties of any kind.

8. Limitation of Liability
Palletium shall not be liable for any indirect, incidental, special, or consequential damages.`;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
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
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    text: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
        lineHeight: 24,
    },
});
