import { Redirect } from 'expo-router';

/**
 * Consolidated: rewards/dividends screen now lives at /(tabs)/rewards.
 * This file redirects any deep links or navigation that still targets /stats/dividends.
 */
export default function DividendsRedirect() {
    return <Redirect href="/(tabs)/rewards" />;
}
