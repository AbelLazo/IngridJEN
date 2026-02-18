import DashboardGrid from '@/components/DashboardGrid';
import { Colors } from '@/constants/theme';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Calendar, Search } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme as keyof typeof Colors];
  const { academicCycles, currentCycleId, enrollments, classes, students } = useInstitution();

  const isTablet = width > 600;

  // Dynamic calculations based on cycle
  const activeCycle = useMemo(() =>
    academicCycles.find(c => c.id === currentCycleId),
    [academicCycles, currentCycleId]
  );

  const activeStudentsCount = useMemo(() => {
    // Unique students enrolled in any class of the current cycle
    const enrolledIds = new Set(
      enrollments
        .filter(e => {
          const cls = classes.find(c => c.id === e.classId);
          return cls && cls.cycleId === currentCycleId;
        })
        .map(e => e.studentId)
    );
    return enrolledIds.size;
  }, [enrollments, classes, currentCycleId]);

  const classesTodayCount = useMemo(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const today = days[new Date().getDay()];

    return classes.filter(c =>
      c.cycleId === currentCycleId &&
      c.schedules.some(s => s.day === today)
    ).length;
  }, [classes, currentCycleId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <View style={{ height: insets.top, backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#6366f1' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 }
        ]}
      >
        <View style={{ overflow: 'hidden' }}>
          <LinearGradient
            colors={colorScheme === 'dark' ? ['#1e293b', '#0f172a'] : ['#6366f1', '#4f46e5']}
            style={[styles.header, isTablet && styles.headerTablet]}
          >
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greeting, { fontSize: isTablet ? 32 : 24 }]}>Hola, Admin 👋</Text>

                {/* Cycle Indicator Badge */}
                <View style={[styles.cycleBadge, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                  <Calendar size={14} color="#fff" />
                  <Text style={styles.cycleBadgeText}>
                    Ciclo Activo: {activeCycle?.name || 'Cargando...'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerIcons}>
                <View style={styles.iconCircle}>
                  <Search size={isTablet ? 24 : 20} color="#fff" />
                </View>
                <View style={[styles.iconCircle, { marginLeft: 12 }]}>
                  <Bell size={isTablet ? 24 : 20} color="#fff" />
                  <View style={styles.badge} />
                </View>
              </View>
            </View>

            {/* Quick Summary Card - Now Dynamic */}
            <View style={[styles.summaryCard, isTablet && styles.summaryCardTablet]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { fontSize: isTablet ? 14 : 12 }]}>Estudiantes en {activeCycle?.name.split(' ')[0]}</Text>
                <Text style={[styles.summaryValue, { fontSize: isTablet ? 28 : 22 }]}>{activeStudentsCount}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { fontSize: isTablet ? 14 : 12 }]}>Cursos para Hoy</Text>
                <Text style={[styles.summaryValue, { fontSize: isTablet ? 28 : 22 }]}>{classesTodayCount}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18 }]}>Menú Principal</Text>
          <DashboardGrid />

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16, fontSize: isTablet ? 24 : 18 }]}>Actividad Reciente</Text>
          <View style={[styles.recentActivity, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.icon, textAlign: 'center', padding: isTablet ? 40 : 20, fontSize: isTablet ? 18 : 14 }}>
              No hay actividad reciente para mostrar.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTablet: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  summaryCardTablet: {
    padding: 30,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  content: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  contentTablet: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  recentActivity: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  cycleBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
