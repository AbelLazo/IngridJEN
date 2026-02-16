import DashboardGrid from '@/components/DashboardGrid';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Search } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme as keyof typeof Colors];

  const isTablet = width > 600;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* 
        Fixed Safe Area Spacer: 
        This keeps the status bar area (clock, battery) static and prevents content 
        from moving under it or pushing it differently during scroll.
      */}
      <View style={{ height: insets.top, backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#6366f1' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]} // Optional: can make the greeting sticky if desired, but here we use it for a static top look
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 }
        ]}
      >
        <View>
          {/* Header Section */}
          <LinearGradient
            colors={colorScheme === 'dark' ? ['#1e293b', '#0f172a'] : ['#6366f1', '#4f46e5']}
            style={[styles.header, isTablet && styles.headerTablet]}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={[styles.greeting, { fontSize: isTablet ? 32 : 24 }]}>Hola, Admin 👋</Text>
                <Text style={[styles.subGreeting, { fontSize: isTablet ? 18 : 14 }]}>Bienvenido a IngridJEN</Text>
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

            {/* Quick Summary Card */}
            <View style={[styles.summaryCard, isTablet && styles.summaryCardTablet]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { fontSize: isTablet ? 14 : 12 }]}>Estudiantes Activos</Text>
                <Text style={[styles.summaryValue, { fontSize: isTablet ? 28 : 20 }]}>1,284</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { fontSize: isTablet ? 14 : 12 }]}>Cursos Hoy</Text>
                <Text style={[styles.summaryValue, { fontSize: isTablet ? 28 : 20 }]}>12</Text>
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
});
