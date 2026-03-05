import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

interface AlertConfig {
    title: string;
    message: string;
    buttons?: AlertButton[];
    type?: 'info' | 'success' | 'error' | 'warning';
}

interface AlertContextType {
    showAlert: (title: string, message: string, buttons?: AlertButton[], type?: AlertConfig['type']) => void;
}

const AlertContext = createContext<AlertContextType>({
    showAlert: () => { },
});

export const useAlert = () => useContext(AlertContext);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<AlertConfig | null>(null);
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    const showAlert = useCallback((title: string, message: string, buttons?: AlertButton[], type?: AlertConfig['type']) => {
        setConfig({ title, message, buttons, type: type || 'info' });
        setVisible(true);
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    }, [scaleAnim, opacityAnim]);

    const hideAlert = useCallback((onPress?: () => void) => {
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setVisible(false);
            setConfig(null);
            if (onPress) onPress();
        });
    }, [scaleAnim, opacityAnim]);

    const getIcon = (type: AlertConfig['type']) => {
        const size = 32;
        switch (type) {
            case 'success': return <CheckCircle size={size} color="#40C057" />;
            case 'error': return <XCircle size={size} color="#ff4d4d" />;
            case 'warning': return <AlertCircle size={size} color="#FAB005" />;
            default: return <Info size={size} color={colors.tint} />;
        }
    };

    const getIconBg = (type: AlertConfig['type']) => {
        switch (type) {
            case 'success': return '#40C05715';
            case 'error': return '#ff4d4d15';
            case 'warning': return '#FAB00515';
            default: return colors.tint + '15';
        }
    };

    const buttons = config?.buttons || [{ text: 'OK', style: 'default' as const }];
    const hasCancel = buttons.some(b => b.style === 'cancel');

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <Modal
                transparent
                visible={visible}
                animationType="none"
                onRequestClose={() => hideAlert()}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={() => {
                    if (hasCancel) {
                        const cancelBtn = buttons.find(b => b.style === 'cancel');
                        hideAlert(cancelBtn?.onPress);
                    }
                }}>
                    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                        <TouchableWithoutFeedback>
                            <Animated.View style={[
                                styles.container,
                                {
                                    backgroundColor: colors.modal,
                                    transform: [{ scale: scaleAnim }],
                                }
                            ]}>
                                {/* Icon */}
                                <View style={[styles.iconContainer, { backgroundColor: getIconBg(config?.type) }]}>
                                    {getIcon(config?.type)}
                                </View>

                                {/* Title */}
                                <Text style={[styles.title, { color: colors.text }]}>
                                    {config?.title}
                                </Text>

                                {/* Message */}
                                <Text style={[styles.message, { color: colors.icon }]}>
                                    {config?.message}
                                </Text>

                                {/* Buttons */}
                                <View style={[
                                    styles.buttonRow,
                                    buttons.length === 1 && { justifyContent: 'center' }
                                ]}>
                                    {buttons.map((btn, index) => {
                                        const isDestructive = btn.style === 'destructive';
                                        const isCancel = btn.style === 'cancel';
                                        const isPrimary = !isCancel && !isDestructive;

                                        let bgColor = colors.tint;
                                        if (isCancel) bgColor = colorScheme === 'light' ? '#F5F5F5' : '#333';
                                        if (isDestructive) bgColor = '#ff4d4d';

                                        let textColor = '#fff';
                                        if (isCancel) textColor = colors.text;

                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.button,
                                                    { backgroundColor: bgColor },
                                                    buttons.length > 1 && { flex: 1 },
                                                    index > 0 && { marginLeft: 10 },
                                                    buttons.length === 1 && { minWidth: 140 },
                                                ]}
                                                onPress={() => hideAlert(btn.onPress)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.buttonText, { color: textColor }]}>
                                                    {btn.text}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Modal>
        </AlertContext.Provider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    container: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: Platform.OS === 'android' ? 10 : 0,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 10,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
    },
    button: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: Platform.OS === 'android' ? 2 : 0,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
