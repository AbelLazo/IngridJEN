import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
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
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const GAP = 14;

// All items use harmonious soft pink tones
const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { id: 'students', label: 'Estudiantes', icon: Users, route: '/students' },
    { id: 'teachers', label: 'Profesores', icon: GraduationCap, route: '/teachers' },
    { id: 'courses', label: 'Cursos', icon: BookOpen, route: '/courses' },
    { id: 'classes', label: 'Clases', icon: Presentation, route: '/classes' },
    { id: 'schedule', label: 'Horario', icon: Calendar, route: '/schedule' },
    { id: 'tuition', label: 'Mensualidad', icon: Wallet, route: '/fees' },
    { id: 'cycles', label: 'Ciclos', icon: Calendar, route: '/cycles' },
    { id: 'admin-users', label: 'Usuarios', icon: Users, route: '/users' },
];

export default function DashboardGrid() {
    const { width } = useWindowDimensions();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { userRole } = useAuth();
    const router = useRouter();

    const filteredMenuItems = MENU_ITEMS.filter(item => {
        if (userRole === 'professor') {
            return item.id === 'schedule';
        }
        return true;
    });

    const columnCount = width > 600 ? 3 : 2;
    const cardWidth = (width - GAP * (columnCount + 1)) / columnCount;

    return (
        <View style={styles.container}>
            {filteredMenuItems.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                    style={{ width: cardWidth }}
                >
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                                borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border,
                            }
                        ]}
                    >
                        <View style={[styles.iconContainer, {
                            backgroundColor: colorScheme === 'light' ? '#FFF0F5' : colors.tint + '15'
                        }]}>
                            <item.icon
                                size={width > 600 ? 26 : 22}
                                color={colors.tint}
                                strokeWidth={1.8}
                            />
                        </View>
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: colors.text,
                                    fontSize: width > 600 ? 15 : 14,
                                }
                            ]}
                            numberOfLines={1}
                        >
                            {item.label}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GAP,
        paddingTop: 4,
        justifyContent: 'flex-start',
        gap: GAP,
    },
    card: {
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 2 : 4,
    },
    iconContainer: {
        width: 46,
        height: 46,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontWeight: '600',
        letterSpacing: -0.2,
        flex: 1,
    },
});
