import DashboardGrid from '@/components/DashboardGrid';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { Calendar, Check, ChevronDown, CloudSun, LogOut, Moon, Sun, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme as keyof typeof Colors];
  const { academicCycles, currentCycleId, setCurrentCycleId, enrollments, classes, students } = useInstitution();
  const { user, userRole } = useAuth();
  const [isCycleMenuVisible, setIsCycleMenuVisible] = useState(false);
  const router = useRouter();
  const [currentDate] = useState(new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Buenos días', icon: <Sun size={20} color="#EAB308" /> };
    if (hour < 18) return { text: 'Buenas tardes', icon: <CloudSun size={20} color="#F59E0B" /> };
    return { text: 'Buenas noches', icon: <Moon size={20} color="#6366F1" /> };
  };

  const greeting = getGreeting();
  const isTablet = width > 600;

  const activeCycle = useMemo(() =>
    academicCycles.find(c => c.id === currentCycleId),
    [academicCycles, currentCycleId]
  );

  const activeStudentsCount = useMemo(() => {
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

    if (activeCycle) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (todayStr < activeCycle.startDate || todayStr > activeCycle.endDate) {
        return 0;
      }
    }

    return classes.filter(c =>
      c.cycleId === currentCycleId &&
      c.schedules.some(s => s.day === today)
    ).length;
  }, [classes, currentCycleId, activeCycle]);

  const handleLogout = async () => {
    try {
      const { auth } = await import('@/lib/firebaseConfig');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 }
          ]}
        >
          {/* ─── Header Area ─── */}
          <View style={[styles.header, isTablet && styles.headerTablet]}>
            <View style={styles.headerTop}>
              <View style={styles.greetingTextContainer}>
                <View style={styles.greetingRow}>
                  {greeting.icon}
                  <Text style={[styles.greetingSub, { color: colors.icon }]}> {greeting.text},</Text>
                </View>
                <Text style={[styles.greeting, { fontSize: isTablet ? 34 : 26, color: colors.text }]}>
                  {user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
                </Text>
                <Text style={[styles.dateText, { color: colors.icon + '99' }]}>
                  {currentDate.charAt(0).toUpperCase() + currentDate.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: colors.secondary }]}
                onPress={handleLogout}
              >
                <LogOut size={isTablet ? 22 : 18} color={colors.tint} />
              </TouchableOpacity>
            </View>

            {/* Cycle Selector Pill */}
            <TouchableOpacity
              onPress={() => setIsCycleMenuVisible(true)}
              activeOpacity={0.7}
              style={styles.cyclePillWrapper}
            >
              <View style={[styles.cyclePill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Calendar size={14} color={colors.tint} />
                <Text style={[styles.cyclePillText, { color: colors.text }]}>
                  {activeCycle?.name || 'Seleccionar Período'}
                </Text>
                <View style={[styles.pillArrow, { backgroundColor: colors.tint + '15' }]}>
                  <ChevronDown size={14} color={colors.tint} />
                </View>
              </View>
            </TouchableOpacity>

            {/* ─── Summary Card ─── */}
            <View
              style={[
                styles.summaryCard,
                isTablet && styles.summaryCardTablet,
                {
                  backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                  borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border,
                }
              ]}
            >
              {userRole !== 'professor' && (
                <>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.icon + '90' }]}>Estudiantes</Text>
                    <Text style={[styles.summaryValue, { fontSize: isTablet ? 30 : 28, color: colors.tint }]}>{activeStudentsCount}</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                </>
              )}
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.icon + '90' }]}>Cursos Hoy</Text>
                <Text style={[styles.summaryValue, { fontSize: isTablet ? 30 : 28, color: colors.tint }]}>{classesTodayCount}</Text>
              </View>
            </View>
          </View>

          {/* ─── Module Grid ─── */}
          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18 }]}>Menú Principal</Text>
            <DashboardGrid />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ─── Cycle Selection Modal ─── */}
      <Modal
        visible={isCycleMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCycleMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsCycleMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.menuContainer,
                {
                  backgroundColor: colors.modal,
                  borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.15)',
                }
              ]}
            >
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Seleccionar Período</Text>
                <TouchableOpacity
                  onPress={() => setIsCycleMenuVisible(false)}
                  style={[styles.closeButton, { backgroundColor: colors.secondary }]}
                >
                  <X size={18} color={colors.tint} />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItemsWrapper}>
                {academicCycles.map((cycle) => {
                  const isSelected = cycle.id === currentCycleId;
                  return (
                    <TouchableOpacity
                      key={cycle.id}
                      style={[
                        styles.modernMenuItem,
                        { backgroundColor: isSelected ? colors.tint : colors.secondary },
                        isSelected && {
                          shadowColor: colors.tint,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: Platform.OS === 'android' ? 4 : 4,
                        }
                      ]}
                      onPress={() => {
                        setCurrentCycleId(cycle.id);
                        setIsCycleMenuVisible(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.menuItemContent}>
                        <View style={[
                          styles.iconBg,
                          { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.tint + '15' }
                        ]}>
                          <Calendar size={16} color={isSelected ? '#FFF' : colors.tint} />
                        </View>
                        <Text style={[
                          styles.cycleName,
                          { color: isSelected ? '#FFF' : colors.text },
                          isSelected && { fontWeight: '700' }
                        ]}>
                          {cycle.name}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Check size={18} color="#FFF" />
                      ) : (
                        <View style={[styles.radioEmpty, { borderColor: colors.tint + '40' }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTablet: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '500',
  },
  greeting: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 2 : 3,
  },
  cyclePillWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  cyclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 1 : 2,
  },
  cyclePillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pillArrow: {
    padding: 3,
    borderRadius: 8,
    marginLeft: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: Platform.OS === 'android' ? 3 : 5,
  },
  summaryCardTablet: {
    padding: 28,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    opacity: 0.5,
  },
  content: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  contentTablet: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontWeight: '800',
    marginHorizontal: 20,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 28,
    padding: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: Platform.OS === 'android' ? 8 : 10,
    overflow: 'hidden',
  },
  menuItemsWrapper: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
  },
  closeButton: {
    padding: 8,
    borderRadius: 14,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cycleName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
