import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
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

const GAP = 12;

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#000000', route: '/dashboard' },
    { id: 'students', label: 'Estudiantes', icon: Users, color: '#000000', route: '/students' },
    { id: 'teachers', label: 'Profesores', icon: GraduationCap, color: '#000000', route: '/teachers' },
    { id: 'courses', label: 'Cursos', icon: BookOpen, color: '#000000', route: '/courses' },
    { id: 'classes', label: 'Clases', icon: Presentation, color: '#000000', route: '/classes' },
    { id: 'schedule', label: 'Horario', icon: Calendar, color: '#000000', route: '/schedule' },
    { id: 'tuition', label: 'Mensualidad', icon: Wallet, color: '#000000', route: '/fees' },
    { id: 'cycles', label: 'Ciclos', icon: Calendar, color: '#000000', route: '/cycles' },
    { id: 'admin-users', label: 'Usuarios', icon: Users, color: '#000000', route: '/users' },
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

    // Horizontal Bento Style Logic: 2 columns, but shorter height
    const columnCount = width > 600 ? 3 : 2;
    const cardWidth = (width - (GAP * (columnCount + 1))) / columnCount;

    return (
        <View style={styles.container}>
            {filteredMenuItems.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.8}
                >
                    <BlurView
                        intensity={90} // Matching Elite intensity
                        tint={colorScheme === 'light' ? 'light' : 'dark'}
                        style={[
                            styles.card,
                            {
                                width: cardWidth,
                                backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.08)',
                                borderColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.15)',
                            }
                        ]}
                    >
                        {/* Liquid Highlight - Specular reflection */}


                        <View style={styles.iconContainer}>
                            <item.icon size={width > 600 ? 28 : 24} color={colorScheme === 'dark' ? colors.text : '#000000'} />
                        </View>
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: colors.text,
                                    fontSize: width > 600 ? 15 : 13
                                }
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {item.label}
                        </Text>
                    </BlurView>
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
        borderRadius: 24,
        paddingVertical: 18,
        paddingHorizontal: 14,
        borderWidth: 1.5, // Thicker glass edge
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5, // Higher elevation for depth
    },
    liquidHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%', // Taller specular reflection
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.04)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    label: {
        fontWeight: '600',
        textAlign: 'left',
        flex: 1,
        zIndex: 1,
    },
});

