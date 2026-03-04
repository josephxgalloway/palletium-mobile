import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type Category = 'bug' | 'feature' | 'account' | 'payment' | 'general';

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'bug', label: 'Bug Report', icon: 'bug-outline' },
    { key: 'feature', label: 'Feature Request', icon: 'bulb-outline' },
    { key: 'account', label: 'Account Issue', icon: 'person-outline' },
    { key: 'payment', label: 'Payment / Billing', icon: 'card-outline' },
    { key: 'general', label: 'General Question', icon: 'chatbubble-outline' },
];

const FAQ_ITEMS = [
    { q: 'How do I earn rewards?', a: 'Listener rewards accrue from first listens on verified artists. You need an active subscription and a verified email address.' },
    { q: 'How do artists get paid?', a: 'Verified artists earn $1.00 per first listen from subscribed listeners. Repeat listens earn $0.01. Payouts are monthly with a $50 minimum threshold.' },
    { q: 'How do I get verified as an artist?', a: 'Go to Settings > Artist Verification and complete the Stripe Identity verification process ($49.99/year). You\'ll need a valid government-issued photo ID.' },
    { q: 'What audio formats are accepted?', a: 'We only accept WAV or FLAC files (16-24 bit, 44.1 kHz). No MP3s or other lossy formats. Max file size is 100MB per track.' },
    { q: 'How do I create a playlist?', a: 'Go to your Library tab and tap the + button to create a new playlist. You can add tracks from the Discover page by long-pressing any track.' },
    { q: 'What is the free trial?', a: 'New listeners get a 7-day free trial of the Basic plan. During the trial, you earn rewards and unlock all streaming features. You can cancel anytime before the trial ends.' },
    { q: 'How do subscription tiers work?', a: 'Basic ($9.99/month) includes standard streaming and rewards. Premium ($14.99/month) gives you a 1.5x rewards multiplier on all eligible listens.' },
    { q: 'What counts as a "first listen"?', a: 'A first listen is the first time you listen to any track by a specific artist. First-listen status resets annually, so you can discover the same artists again each year.' },
    { q: 'Can I upload music as a listener?', a: 'You can switch to an artist account in your Settings. Unverified artists can upload up to 3 tracks for free with plays earning $0.004 each.' },
    { q: 'Can I change my email?', a: 'Please email support@palletium.com to request an email change for your account.' },
    { q: 'How do I delete my account?', a: 'Go to Settings and scroll to the bottom. For full account deletion, please contact support@palletium.com with your registered email address.' },
    { q: 'Why is my track pending review?', a: 'All new uploads go through a review process before appearing on Discover. This usually takes 24-48 hours. You\'ll be notified when your track is approved.' },
];

export default function SupportScreen() {
    const { user } = useAuthStore();
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const handleSubmit = async () => {
        if (!selectedCategory || !subject.trim() || !message.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Please fill in all fields',
                text2: 'Select a category, subject, and message',
            });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/support/feedback', {
                category: selectedCategory,
                subject: subject.trim(),
                message: message.trim(),
                source: 'mobile',
            });

            setSubmitted(true);
            Toast.show({
                type: 'success',
                text1: 'Submitted successfully',
                text2: 'We\'ll get back to you soon',
            });
        } catch (error: any) {
            // If the endpoint doesn't exist, fall back to email
            const errorStatus = error.response?.status;
            if (errorStatus === 404) {
                Linking.openURL(
                    `mailto:support@palletium.com?subject=${encodeURIComponent(`[${selectedCategory}] ${subject.trim()}`)}&body=${encodeURIComponent(message.trim())}`
                );
                setSubmitted(true);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to submit',
                    text2: 'Please try emailing support@palletium.com',
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedCategory(null);
        setSubject('');
        setMessage('');
        setSubmitted(false);
    };

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
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Success State */}
                {submitted ? (
                    <View style={styles.successContainer}>
                        <View style={styles.successIconRing}>
                            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                        </View>
                        <Text style={styles.successTitle}>Message Sent</Text>
                        <Text style={styles.successSubtitle}>
                            We've received your message and will respond within 24-48 hours.
                        </Text>
                        <TouchableOpacity style={styles.newTicketButton} onPress={resetForm}>
                            <Text style={styles.newTicketText}>Send Another Message</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* FAQ Section */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="help-circle-outline" size={16} color={theme.colors.textMuted} />
                                <Text style={styles.sectionTitle}>FREQUENTLY ASKED</Text>
                            </View>
                            <View style={styles.faqCard}>
                                {FAQ_ITEMS.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.faqItem, index < FAQ_ITEMS.length - 1 && styles.faqItemBorder]}
                                        onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                        activeOpacity={0.6}
                                    >
                                        <View style={styles.faqQuestion}>
                                            <Text style={styles.faqQuestionText}>{item.q}</Text>
                                            <Ionicons
                                                name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                                                size={16}
                                                color={theme.colors.textMuted}
                                            />
                                        </View>
                                        {expandedFaq === index && (
                                            <Text style={styles.faqAnswerText}>{item.a}</Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Contact Form */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.textMuted} />
                                <Text style={styles.sectionTitle}>CONTACT US</Text>
                            </View>

                            {/* Category Selection */}
                            <View style={styles.categoriesGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.key}
                                        style={[
                                            styles.categoryChip,
                                            selectedCategory === cat.key && styles.categoryChipSelected,
                                        ]}
                                        onPress={() => setSelectedCategory(cat.key)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={cat.icon}
                                            size={16}
                                            color={selectedCategory === cat.key ? theme.colors.background : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.categoryChipText,
                                            selectedCategory === cat.key && styles.categoryChipTextSelected,
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Subject */}
                            <TextInput
                                style={styles.input}
                                value={subject}
                                onChangeText={setSubject}
                                placeholder="Subject"
                                placeholderTextColor={theme.colors.textMuted}
                            />

                            {/* Message */}
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Describe your issue or question..."
                                placeholderTextColor={theme.colors.textMuted}
                                multiline
                                textAlignVertical="top"
                            />

                            {/* Submit */}
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!selectedCategory || !subject.trim() || !message.trim()) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmit}
                                disabled={submitting || !selectedCategory || !subject.trim() || !message.trim()}
                                activeOpacity={0.8}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={theme.colors.background} />
                                ) : (
                                    <>
                                        <Ionicons name="send" size={18} color={theme.colors.background} />
                                        <Text style={styles.submitButtonText}>Send Message</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Direct Email */}
                        <TouchableOpacity
                            style={styles.emailCard}
                            onPress={() => Linking.openURL('mailto:support@palletium.com')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.emailIconContainer}>
                                <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <View style={styles.emailTextContainer}>
                                <Text style={styles.emailLabel}>Email us directly</Text>
                                <Text style={styles.emailAddress}>support@palletium.com</Text>
                            </View>
                            <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </>
                )}
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
    sectionContainer: {
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
        letterSpacing: 1,
    },
    // FAQ
    faqCard: {
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
    },
    faqItem: {
        padding: theme.spacing.md,
    },
    faqItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(192,200,214,0.04)',
    },
    faqQuestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestionText: {
        flex: 1,
        fontSize: theme.fontSize.md,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        marginRight: theme.spacing.sm,
    },
    faqAnswerText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginTop: theme.spacing.sm,
    },
    // Categories
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.08)',
    },
    categoryChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryChipText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    categoryChipTextSelected: {
        color: theme.colors.background,
    },
    // Form
    input: {
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 12,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.08)',
        marginBottom: theme.spacing.sm,
    },
    textArea: {
        height: 120,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: theme.spacing.sm,
    },
    submitButtonDisabled: {
        opacity: 0.4,
    },
    submitButtonText: {
        color: theme.colors.background,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    // Email Card
    emailCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 14,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
        marginBottom: theme.spacing.lg,
    },
    emailIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(108,134,168,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emailTextContainer: {
        flex: 1,
    },
    emailLabel: {
        fontSize: theme.fontSize.md,
        fontWeight: '500',
        color: theme.colors.textPrimary,
    },
    emailAddress: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // Success
    successContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    successIconRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16,185,129,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    successTitle: {
        fontSize: theme.fontSize.xxl,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    successSubtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: theme.spacing.xl,
    },
    newTicketButton: {
        marginTop: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.08)',
    },
    newTicketText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: theme.fontSize.md,
    },
});
