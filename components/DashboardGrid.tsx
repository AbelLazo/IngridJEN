import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import {
    BookOpen,
    Calendar,
    GraduationCap,
    LayoutDashboard,
    Presentation,
    Users,
    Wallet
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const GAP = 16;

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1', route: '/(tabs)' },
    { id: 'students', label: 'Estudiantes', icon: Users, color: '#f59e0b', route: '/students' },
    { id: 'teachers', label: 'Profesores', icon: GraduationCap, color: '#10b981', route: '/teachers' },
    { id: 'courses', label: 'Cursos', icon: BookOpen, color: '#3b82f6', route: '/courses' },
    { id: 'classes', label: 'Clases', icon: Presentation, color: '#ec4899', route: '/classes' },
    { id: 'schedule', label: 'Horario', icon: Calendar, color: '#8b5cf6', route: '/schedule' },
    { id: 'tuition', label: 'Mensualidad', icon: Wallet, color: '#ef4444', route: '/fees' },
];

export default function DashboardGrid() {
    const { width } = useWindowDimensions();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const router = useRouter();

    // Responsive logic: 2 columns on phones, 3 or more on tablets
    const columnCount = width > 600 ? 3 : 2;
    const cardWidth = (width - (GAP * (columnCount + 1))) / columnCount;

    return (
        <View style={styles.container}>
            {MENU_ITEMS.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={[
                        styles.card,
                        {
                            width: cardWidth,
                            height: cardWidth * 0.95,
                            backgroundColor: colors.card,
                            borderColor: colors.border
                        }
                    ]}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                        <item.icon size={width > 600 ? 32 : 28} color={item.color} />
                    </View>
                    <Text
                        style={[
                            styles.label,
                            {
                                color: colors.text,
                                fontSize: width > 600 ? 16 : 14
                            }
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: GAP,
        justifyContent: 'flex-start',
        gap: GAP,
    },
    card: {
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        // Elevation for Android
        elevation: 4,
    },
    iconContainer: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    label: {
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
    },
});

