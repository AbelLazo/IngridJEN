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
    Tag,
    Users,
    Wallet
} from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const GAP = 14;

// All items use harmonious soft pink tones
const MENU_ITEMS = [
    { id: 'cycles', label: 'Ciclos', icon: Calendar, route: '/cycles' },
    { id: 'courses', label: 'Cursos', icon: BookOpen, route: '/courses' },
    { id: 'teachers', label: 'Profesores', icon: GraduationCap, route: '/teachers' },
    { id: 'students', label: 'Estudiantes', icon: Users, route: '/students' },
    { id: 'classes', label: 'Clases', icon: Presentation, route: '/classes' },
    { id: 'schedule', label: 'Horario', icon: Calendar, route: '/schedule' },
    { id: 'tuition', label: 'Mensualidad', icon: Wallet, route: '/fees' },
    { id: 'promotions', label: 'Promociones', icon: Tag, route: '/promotions' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
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
            {filteredMenuItems.map((item, index) => (
                <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(700 + (index * 100)).duration(800).springify().damping(15)}
                    style={{ width: cardWidth }}
                >
                    <TouchableOpacity
                        onPress={() => router.push(item.route as any)}
                        activeOpacity={0.7}
                    >
                    <LinearGradient
                        colors={colorScheme === 'light' 
                            ? ['#FFFFFF', '#FDF2F8'] // White to very faint pink
                            : [colors.card, colors.background]} // Dark card to dark bg
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.card,
                            {
                                borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border,
                                shadowColor: colorScheme === 'light' ? colors.tint : '#000',
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={colorScheme === 'light' 
                                ? [colors.tint + '20', colors.tint + '05']
                                : [colors.tint + '30', colors.tint + '10']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconContainer}
                        >
                            <item.icon
                                size={width > 600 ? 26 : 22}
                                color={colors.tint}
                                strokeWidth={2}
                            />
                        </LinearGradient>
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: colors.text,
                                    fontSize: width > 600 ? 15 : 13,
                                    flexShrink: 1,
                                }
                            ]}
                            numberOfLines={2}
                        >
                            {item.label}
                        </Text>
                    </LinearGradient>
                 </TouchableOpacity>
                </Animated.View>
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
        gap: 10,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: Platform.OS === 'android' ? 3 : 6,
    },
    iconContainer: {
        width: 44,
        height: 44,
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
