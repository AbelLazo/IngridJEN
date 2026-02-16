import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GenericScreen({ title }: { title: string }) {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    const isTablet = width > 600;

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, isTablet && styles.headerTablet]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={isTablet ? 32 : 28} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text, fontSize: isTablet ? 28 : 20 }]}>{title}</Text>
                <View style={{ width: isTablet ? 32 : 28 }} />
            </View>
            <View style={[styles.content, isTablet && styles.contentTablet]}>
                <View style={[styles.placeholderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.placeholderText, { color: colors.icon, fontSize: isTablet ? 18 : 16 }]}>
                        Esta es la sección de {title}. Contenido en desarrollo...
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTablet: {
        paddingHorizontal: 32,
        paddingVertical: 24,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    contentTablet: {
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
        padding: 40,
    },
    placeholderCard: {
        padding: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        textAlign: 'center',
    },
});
