import DashboardGrid from '@/components/DashboardGrid';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
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

    // Check if today is within active cycle dates
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
          <View style={styles.headerContainer}>
            <View style={[styles.header, isTablet && styles.headerTablet]}>
              <View style={styles.headerTop}>
                <View style={styles.greetingWrapper}>
                  <View style={styles.greetingTextContainer}>
                    <View style={styles.greetingRow}>
                      {greeting.icon}
                      <Text style={[styles.greetingSub, { color: colors.icon }]}> {greeting.text},</Text>
                    </View>
                    <Text style={[styles.greeting, { fontSize: isTablet ? 32 : 24, color: colors.text }]}>
                      {user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
                    </Text>
                    <Text style={[styles.dateText, { color: colors.icon + '80' }]}>
                      {currentDate.charAt(0).toUpperCase() + currentDate.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerIcons}>
                  <TouchableOpacity style={[styles.iconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.5)' }]} onPress={handleLogout}>
                    <LogOut size={isTablet ? 24 : 20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cycleSelectorRow}>
                {/* Modern Glass Chip Selector Trigger */}
                <TouchableOpacity
                  onPress={() => setIsCycleMenuVisible(true)}
                  activeOpacity={0.7}
                  style={styles.cycleBadgeWrapper}
                >
                  <BlurView
                    intensity={90}
                    tint={colorScheme === 'light' ? 'light' : 'dark'}
                    style={[
                      styles.cycleBadge,
                      {
                        backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                        borderColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.15)',
                      }
                    ]}
                  >
                    <View style={styles.cycleBadgeContent}>
                      <Calendar size={14} color={colors.text} />
                      <Text style={[styles.cycleBadgeText, { color: colors.text }]}>
                        {activeCycle?.name || 'Seleccionar Período'}
                      </Text>
                      <View style={[styles.badgeArrow, { backgroundColor: colors.text + '15' }]}>
                        <ChevronDown size={14} color={colors.text} />
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </View>

              {/* Quick Summary Card */}
              <BlurView
                intensity={90}
                tint={colorScheme === 'light' ? 'light' : 'dark'}
                style={[
                  styles.summaryCard,
                  isTablet && styles.summaryCardTablet,
                  {
                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.08)',
                    borderColor: colorScheme === 'light' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.15)'
                  }
                ]}
              >

                {userRole !== 'professor' && (
                  <>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { fontSize: isTablet ? 14 : 12, color: colors.text, opacity: 0.7 }]}>Estudiantes</Text>
                      <Text style={[styles.summaryValue, { fontSize: isTablet ? 28 : 24, color: colors.text }]}>{activeStudentsCount}</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.text, opacity: 0.1 }]} />
                  </>
                )}
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { fontSize: isTablet ? 14 : 12, color: colors.text, opacity: 0.7 }]}>Cursos Hoy</Text>
                  <Text style={[styles.summaryValue, { fontSize: isTablet ? 28 : 24, color: colors.text }]}>{classesTodayCount}</Text>
                </View>
              </BlurView>
            </View>
          </View>

          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18 }]}>Menú Principal</Text>
            <DashboardGrid />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Dropdown Menu Modal */}
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
                  borderColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.15)',
                }
              ]}
            >
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Seleccionar Período</Text>
                <TouchableOpacity
                  onPress={() => setIsCycleMenuVisible(false)}
                  style={[styles.closeButton, { backgroundColor: colors.border + '30' }]}
                >
                  <X size={18} color={colors.text} />
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
                        isSelected && {
                          backgroundColor: colors.primary,
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: Platform.OS === 'android' ? 0 : 4,
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
                          { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.border + '40' }
                        ]}>
                          <Calendar size={16} color={isSelected ? '#FFF' : colors.text} />
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
                        <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
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
  headerContainer: {
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
  },
  headerTablet: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontWeight: '700',
  },
  greetingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  avatarWrapper: {
    // Hidden or removed
  },
  avatarBlur: {
    // Hidden or removed
  },
  avatarText: {
    // Hidden or removed
  },
  greetingTextContainer: {
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  cycleSelectorRow: {
    marginBottom: 15,
  },
  headerIcons: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: Platform.OS === 'android' ? 0 : 5,
  },
  summaryCardTablet: {
    padding: 24,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    opacity: 0.2,
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
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cycleBadgeWrapper: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cycleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cycleBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cycleBadgeText: {
    fontSize: 13,
    fontWeight: '700', // Increased weight
    letterSpacing: -0.2,
  },
  badgeArrow: {
    padding: 3,
    borderRadius: 6,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Deeper backdrop for contrast
    justifyContent: 'center', // Center it for better focus
    alignItems: 'center',
  },
  menuContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: Platform.OS === 'android' ? 0 : 10,
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
    padding: 6,
    borderRadius: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800', // Stronger font
    letterSpacing: -0.5,
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 4,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    opacity: 0.3,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cycleName: {
    fontSize: 16,
  },
});
