import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

export default function OAuthRedirectScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';

    useEffect(() => {
        // A small delay ensures `expo-auth-session` catches the native intent URL before we navigate
        const timer = setTimeout(() => {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/login');
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors[theme].background, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors[theme].tint} />
        </View>
    );
}
