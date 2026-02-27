import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { AlertCircle, Award, Calendar, ChevronLeft, DollarSign, TrendingUp, Users } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const router = useRouter();
    const { academicCycles, currentCycleId, enrollments, classes, students, installments, payments, courses } = useInstitution();
    const { userRole } = useAuth();
    const isTablet = width > 600;

    if (userRole !== 'admin') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <AlertCircle size={48} color={colors.secondary} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso Denegado</Text>
                <Text style={{ color: colors.icon, marginTop: 8 }}>Solo los administradores pueden ver este dashboard.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 12 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const activeCycle = useMemo(() =>
        academicCycles.find(c => c.id === currentCycleId),
        [academicCycles, currentCycleId]
    );

    // Filter students active in the current cycle
    const activeStudentsCount = useMemo(() => {
        const enrolledIds = new Set(
            enrollments
                .filter(e => {
                    if (e.status !== 'active') return false;
                    const cls = classes.find(c => c.id === e.classId);
                    return cls && cls.cycleId === currentCycleId;
                })
                .map(e => e.studentId)
        );
        let validCount = 0;
        enrolledIds.forEach(id => {
            const student = students.find(s => s.id === id);
            if (student && student.status === 'active') {
                const cycleYear = activeCycle?.name.match(/\d{4}/)?.[0];
                if (cycleYear && student.activeYears?.includes(cycleYear)) {
                    validCount++;
                }
            }
        });
        return validCount;
    }, [enrollments, classes, currentCycleId, students, activeCycle]);

    // Financial Metrics with Retroactive Discount logic
    const { totalCollected, totalDebt, monthlyData, maxValue } = useMemo(() => {
        let collected = 0;
        let debt = 0;
        const monthlyCollectedMap: Record<string, number> = {};
        const allMonthsSet = new Set<string>();

        const cycleEnrollments = enrollments.filter(e =>
            classes.some(c => c.id === e.classId && c.cycleId === currentCycleId)
        );

        cycleEnrollments.forEach(enrol => {
            const cls = classes.find(c => c.id === enrol.classId);
            const course = courses.find(co => co.id === cls?.courseId);

            const enrolInstallments = installments.filter(inst => inst.enrollmentId === enrol.id);
            enrolInstallments.forEach(inst => {
                let isAfterWithdrawal = false;
                if (enrol.status === 'withdrawn' && enrol.withdrawalDate) {
                    const withdrawMonthYear = enrol.withdrawalDate.substring(0, 7);
                    if (inst.monthYear > withdrawMonthYear) {
                        isAfterWithdrawal = true;
                    }
                }

                if (isAfterWithdrawal) return;

                allMonthsSet.add(inst.monthYear);
                let finalAmount = parseFloat(inst.amount);

                if (inst.isPaid) {
                    collected += finalAmount;
                    monthlyCollectedMap[inst.monthYear] = (monthlyCollectedMap[inst.monthYear] || 0) + finalAmount;
                } else {
                    // Recalculate if discount was missed
                    if (activeCycle && activeCycle.events && activeCycle.events.length > 0) {
                        const monthEvents = activeCycle.events.filter(e => {
                            let evtTarget = e.targetMonthYear;
                            const parts = evtTarget.split('-');
                            if (parts.length === 2) evtTarget = `${parts[0]}-${parts[1].padStart(2, '0')}`;

                            let instTarget = inst.monthYear;
                            const instParts = instTarget.split('-');
                            if (instParts.length === 2) instTarget = `${instParts[0]}-${instParts[1].padStart(2, '0')}`;

                            return evtTarget === instTarget;
                        });

                        if (monthEvents.length > 0) {
                            let totalDiscountPercentage = 0;
                            monthEvents.forEach(e => { totalDiscountPercentage += e.discountPercentage; });
                            if (totalDiscountPercentage > 100) totalDiscountPercentage = 100;
                            const coursePrice = parseFloat(course?.price || '0');
                            if (finalAmount >= coursePrice) {
                                finalAmount = coursePrice - (coursePrice * (totalDiscountPercentage / 100));
                            }
                        }
                    }
                    debt += finalAmount;
                }
            });
        });

        // Completar meses intermedios (incluso con 0 ingresos)
        const uniqueMonths = Array.from(allMonthsSet).sort();
        let chartMonths: string[] = [];

        if (uniqueMonths.length > 0) {
            const minMonthStr = uniqueMonths[0];
            const maxMonthStr = uniqueMonths[uniqueMonths.length - 1];

            let [minY, minM] = minMonthStr.split('-').map(Number);
            const [maxY, maxM] = maxMonthStr.split('-').map(Number);

            while (minY < maxY || (minY === maxY && minM <= maxM)) {
                const monthStr = `${minY}-${minM.toString().padStart(2, '0')}`;
                chartMonths.push(monthStr);
                if (!monthlyCollectedMap[monthStr]) {
                    monthlyCollectedMap[monthStr] = 0;
                }
                minM++;
                if (minM > 12) {
                    minM = 1;
                    minY++;
                }
            }
        }

        const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Formato para react-native-gifted-charts
        // Calculamos el valor máximo para estimar la altura en pantalla de cada barra
        let maxValue = chartMonths.length > 0 ? Math.max(...chartMonths.map(m => monthlyCollectedMap[m] || 0)) : 0;
        if (maxValue === 0) maxValue = 1; // Prevenir división por cero
        const chartHeight = 220;

        // Formato para react-native-gifted-charts
        return {
            totalCollected: collected,
            totalDebt: debt,
            monthlyData: chartMonths.length > 0 ? chartMonths.map(m => {
                const val = monthlyCollectedMap[m] || 0;
                let label = m;
                const parts = m.split('-');
                if (parts.length === 2) {
                    const monthIndex = parseInt(parts[1], 10) - 1;
                    label = MONTH_NAMES[monthIndex];
                }

                return {
                    value: val,
                    label,
                    topLabelComponent: val > 0 ? () => {
                        // Desplazar el label hacia la mitad de la barra visual (+ offset)
                        const barHeightPixels = (val / (maxValue * 1.2)) * chartHeight;
                        return (
                            <View style={{ position: 'absolute', top: barHeightPixels / 2, width: 35, alignItems: 'center', zIndex: 10, transform: [{ rotate: '-90deg' }] }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                                    {val.toFixed(0)}
                                </Text>
                            </View>
                        );
                    } : undefined
                };
            }) : [{ value: 0, label: 'S/D' }],
            maxValue: maxValue * 1.2 // Añadir 20% de holgura superior
        };
    }, [enrollments, classes, currentCycleId, installments, payments, activeCycle, courses]);

    // Classes capacity logic
    const topClasses = useMemo(() => {
        const cycleClasses = classes.filter(c => c.cycleId === currentCycleId);
        const classStats = cycleClasses.map(cls => {
            const count = enrollments.filter(e => e.classId === cls.id && e.status === 'active').length;
            const capacity = parseInt(cls.capacity || '20');
            return {
                ...cls,
                count,
                percentage: (count / capacity) * 100
            };
        });

        // Sort descending by percentage
        classStats.sort((a, b) => b.percentage - a.percentage);
        return classStats.slice(0, 3);
    }, [classes, enrollments, currentCycleId]);

    // Low capacity logic
    const emptyClasses = useMemo(() => {
        const cycleClasses = classes.filter(c => c.cycleId === currentCycleId);
        const classStats = cycleClasses.map(cls => {
            const count = enrollments.filter(e => e.classId === cls.id && e.status === 'active').length;
            const capacity = parseInt(cls.capacity || '20');
            return { ...cls, count, capacity };
        });
        classStats.sort((a, b) => a.count - b.count);
        return classStats.filter(c => c.count < 5).slice(0, 3);
    }, [classes, enrollments, currentCycleId]);


    const pieChartData = [
        {
            value: totalCollected,
            color: '#22D3EE', // Cyan Eléctrico (Recaudado)
            gradientCenterColor: '#0891B2',
            text: 'S/' + totalCollected.toFixed(0),
            textColor: '#FFF'
        },
        {
            value: totalDebt,
            color: '#C084FC', // Violeta Neón (Deuda)
            gradientCenterColor: '#9333EA',
            text: 'S/' + totalDebt.toFixed(0),
            textColor: '#FFF'
        }
    ];

    const formatCurrency = (amount: number) => `S/ ${amount.toFixed(2)}`;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
            <View style={{ height: insets.top }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
                <View style={{ overflow: 'hidden' }}>
                    <View style={[styles.header, isTablet && styles.headerTablet]}>
                        <View style={styles.headerTop}>
                            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <ChevronLeft size={24} color={colors.text} />
                            </TouchableOpacity>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <Text style={[styles.greeting, { fontSize: isTablet ? 32 : 24, color: colors.text }]}>Dashboard de Negocio</Text>
                                <View style={[styles.cycleBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                    <Calendar size={14} color={colors.primary} />
                                    <Text style={[styles.cycleBadgeText, { color: colors.text }]}>Ciclo: {activeCycle?.name || 'Cargando...'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* 4 KPIs Row */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.kpiScrollView}
                            contentContainerStyle={styles.kpiScrollContent}
                        >
                            <BlurView
                                intensity={90}
                                tint={colorScheme === 'light' ? 'light' : 'dark'}
                                style={[styles.kpiCard, {
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'
                                }]}
                            >
                                <View style={styles.liquidHighlight} />
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#4C6EF515' : '#4C6EF530' }]}>
                                    <Users size={22} color="#4C6EF5" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{activeStudentsCount}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Alumnos Activos</Text>
                            </BlurView>

                            <BlurView
                                intensity={90}
                                tint={colorScheme === 'light' ? 'light' : 'dark'}
                                style={[styles.kpiCard, {
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'
                                }]}
                            >
                                <View style={styles.liquidHighlight} />
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#12B88615' : '#12B88630' }]}>
                                    <DollarSign size={22} color="#12B886" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{formatCurrency(totalCollected)}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Recaudado</Text>
                            </BlurView>

                            <BlurView
                                intensity={90}
                                tint={colorScheme === 'light' ? 'light' : 'dark'}
                                style={[styles.kpiCard, {
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'
                                }]}
                            >
                                <View style={styles.liquidHighlight} />
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#FA525215' : '#FA525230' }]}>
                                    <TrendingUp size={22} color="#FA5252" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{formatCurrency(totalDebt)}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Cuentas X Cobrar</Text>
                            </BlurView>

                            <BlurView
                                intensity={90}
                                tint={colorScheme === 'light' ? 'light' : 'dark'}
                                style={[styles.kpiCard, {
                                    marginRight: 40,
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)'
                                }]}
                            >
                                <View style={styles.liquidHighlight} />
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#FAB00515' : '#FAB00530' }]}>
                                    <Award size={22} color="#FAB005" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{classes.filter(c => c.cycleId === currentCycleId).length}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Total Clases</Text>
                            </BlurView>
                        </ScrollView>
                    </View>
                </View>

                <View style={[styles.content, isTablet && styles.contentTablet]}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18 }]}>Salud Financiera (Ciclo Actual)</Text>

                    <BlurView
                        intensity={90}
                        tint={colorScheme === 'light' ? 'light' : 'dark'}
                        style={[styles.chartCard, {
                            backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                            borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'
                        }]}
                    >
                        <View style={styles.liquidHighlight} />
                        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 20, alignSelf: 'flex-start', letterSpacing: -0.5 }}>Ingresos Históricos (S/ Por Mes)</Text>
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            <BarChart
                                data={monthlyData}
                                maxValue={maxValue}
                                width={Dimensions.get('window').width - (isTablet ? 140 : 100)}
                                height={220}
                                barWidth={isTablet ? 35 : 22}
                                spacing={isTablet ? 30 : 18}
                                initialSpacing={15}
                                roundedTop
                                yAxisThickness={0}
                                hideYAxisText
                                hideRules
                                xAxisThickness={1}
                                xAxisColor={colors.border}
                                xAxisLabelTextStyle={{ color: colors.icon, fontSize: 11 }}
                                frontColor={colors.primary}
                                isAnimated
                                showFractionalValues={false}
                            />
                        </View>
                    </BlurView>

                    <BlurView
                        intensity={90}
                        tint={colorScheme === 'light' ? 'light' : 'dark'}
                        style={[styles.chartCard, {
                            backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                            borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                            alignItems: 'center'
                        }]}
                    >
                        <View style={styles.liquidHighlight} />
                        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 20, alignSelf: 'flex-start', letterSpacing: -0.5 }}>Balance de Cuotas</Text>
                        {totalCollected === 0 && totalDebt === 0 ? (
                            <Text style={{ color: colors.icon, marginVertical: 20 }}>No hay cuotas registradas en este ciclo.</Text>
                        ) : (
                            <View style={{ alignItems: 'center', marginVertical: 10 }}>
                                <View style={{ alignItems: 'center', justifyContent: 'center', height: 240, width: '100%' }}>
                                    <PieChart
                                        data={pieChartData}
                                        donut
                                        radius={105}
                                        innerRadius={78}
                                        innerCircleColor={colorScheme === 'dark' ? '#2D2621' : '#F5F5F7'}
                                        centerLabelComponent={() => {
                                            const total = totalCollected + totalDebt;
                                            return (
                                                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 11, color: colors.icon, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Total</Text>
                                                    <Text style={{ fontSize: 22, color: colors.text, fontWeight: '900', marginTop: 1 }}>{formatCurrency(total).split('.')[0]}</Text>
                                                </View>
                                            );
                                        }}
                                        isAnimated
                                        animationDuration={1200}
                                    />
                                </View>
                                {/* Custom Legend */}
                                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#22D3EE', marginRight: 8 }} />
                                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Recaudado: {formatCurrency(totalCollected).split('.')[0]}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#C084FC', marginRight: 8 }} />
                                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Por Cobrar: {formatCurrency(totalDebt).split('.')[0]}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </BlurView>

                    {/* Top Classes & Alerts */}
                    <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18, marginLeft: 0 }]}>Top Clases (Ocupación)</Text>

                        {topClasses.length === 0 && <Text style={{ color: colors.icon }}>No hay clases con matrículas.</Text>}
                        {topClasses.map((c, i) => (
                            <BlurView
                                key={c.id}
                                intensity={90}
                                tint={colorScheme === 'light' ? 'light' : 'dark'}
                                style={[styles.listItem, {
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'
                                }]}
                            >
                                <View style={[styles.liquidHighlight, { opacity: 0.8 }]} />
                                <View style={[styles.listRank, { backgroundColor: i === 0 ? '#FAB005' : i === 1 ? '#adb5bd' : '#cd7f32' }]}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{i + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{c.courseName}</Text>
                                    <Text style={{ color: colors.icon, fontSize: 12 }}>{c.teacherName}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{c.count} / {c.capacity}</Text>
                                    <Text style={{ color: colors.icon, fontSize: 11 }}>{c.percentage.toFixed(0)}% Ocupado</Text>
                                </View>
                            </BlurView>
                        ))}

                        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18, marginLeft: 0, marginTop: 20 }]}>Clases en Riesgo (Baja Ocupación)</Text>
                        {emptyClasses.length === 0 && <Text style={{ color: colors.icon }}>No hay clases con baja ocupación.</Text>}
                        {emptyClasses.map(c => (
                            <BlurView
                                key={c.id}
                                intensity={90}
                                tint={colorScheme === 'light' ? 'light' : 'dark'}
                                style={[styles.listItem, {
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.08)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.15)'
                                }]}
                            >
                                <View style={[styles.liquidHighlight, { opacity: 0.8 }]} />
                                <View style={[styles.listRank, { backgroundColor: '#FA5252' }]}>
                                    <AlertCircle size={16} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{c.courseName}</Text>
                                    <Text style={{ color: colors.icon, fontSize: 12 }}>{c.teacherName}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: '#FA5252', fontWeight: 'bold' }}>{c.count} / {c.capacity}</Text>
                                </View>
                            </BlurView>
                        ))}
                    </View>

                </View>
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    header: {
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
    },
    headerTablet: { paddingHorizontal: 40, paddingTop: 20, paddingBottom: 40 },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center'
    },
    greeting: { fontWeight: '800', letterSpacing: -0.5 },
    cycleBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 10,
    },
    cycleBadgeText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
    kpiScrollView: {
        marginHorizontal: -20,
    },
    kpiScrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 12, // Espacio para que no se corten las sombras
    },
    kpiCard: {
        borderRadius: 24, padding: 20, marginRight: 16,
        width: 160, overflow: 'hidden',
        borderWidth: 1.5,
        alignItems: 'flex-start',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08, shadowRadius: 15, elevation: 5
    },
    liquidHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    kpiIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
    kpiLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
    content: { paddingTop: 24, paddingBottom: 40 },
    contentTablet: { maxWidth: 1000, alignSelf: 'center', width: '100%' },
    sectionTitle: { fontWeight: '800', marginHorizontal: 20, marginBottom: 16, letterSpacing: -0.5 },
    chartCard: {
        marginHorizontal: 20, borderRadius: 24, borderWidth: 1.5, padding: 20, marginBottom: 15,
        alignItems: 'center', overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08, shadowRadius: 15, elevation: 5
    },
    listItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24,
        borderWidth: 1.5, marginBottom: 14, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 5
    },
    listRank: {
        width: 30, height: 30, borderRadius: 15, justifyContent: 'center',
        alignItems: 'center', marginRight: 15
    }
});
