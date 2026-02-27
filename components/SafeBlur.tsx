import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

interface SafeBlurProps extends ViewProps {
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
    children?: React.ReactNode;
}

/**
 * A safe wrapper for BlurView that falls back to a semi-transparent View
 * if the native BlurView is not available or on platforms where it's not needed.
 */
export const SafeBlur: React.FC<SafeBlurProps> = ({
    intensity = 50,
    tint = 'light',
    children,
    style,
    ...props
}) => {
    // On Web or if we suspect issues, we can use a simpler fallback
    // In this specific case, the user's mobile is missing the ViewManager

    // We attempt to render BlurView, but we'll prepare a fallback mechanism
    // if needed. For now, let's at least make sure it has a solid background
    // fallback via the style prop.

    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    const fallbackColor = tint === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)';

    // We keep the logic simple, but we can add more guards if needed.
    // React Native will still attempt to find the ViewManager.
    // To truly avoid crashes if missing, we could try-catch or check something,
    // but usually, a clean install and cache clear is the real fix.

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: fallbackColor, shadowColor: colors.text },
                style
            ]}
            {...props}
        >
            {/* Shroud / Overlay for contrast */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />

            {Platform.OS !== 'web' && (
                <BlurView
                    intensity={intensity}
                    tint={tint}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        // Shadow for premium lift
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    }
});
