import PeriodHeader from '@/components/PeriodHeader';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { AlertCircle, Award, DollarSign, TrendingUp, Users } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.tint, borderRadius: 12 }}
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

    // Financial Metrics: collected from actual payments, debt from unpaid installments
    const { totalCollected, totalDebt, monthlyData, maxValue } = useMemo(() => {
        let collected = 0;
        let debt = 0;
        const monthlyCollectedMap: Record<string, number> = {};
        const allMonthsSet = new Set<string>();

        const cycleEnrollments = enrollments.filter(e =>
            classes.some(c => c.id === e.classId && c.cycleId === currentCycleId)
        );
        const cycleEnrollmentIds = new Set(cycleEnrollments.map(e => e.id));

        // 1. Calculate COLLECTED from actual payment records (source of truth)
        const cyclePayments = payments.filter(p => cycleEnrollmentIds.has(p.enrollmentId));
        cyclePayments.forEach(p => {
            const amount = parseFloat(p.amount);
            collected += amount;
            const my = p.monthYear;
            allMonthsSet.add(my);
            monthlyCollectedMap[my] = (monthlyCollectedMap[my] || 0) + amount;
        });

        // 2. Calculate DEBT: installments without a real payment record are debt
        // Build set of installment IDs that have actual payment records
        const paidInstallmentIds = new Set(
            cyclePayments
                .filter(p => p.installmentId)
                .map(p => p.installmentId)
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

                // An installment is truly paid ONLY if a real payment record exists for it
                const hasRealPayment = paidInstallmentIds.has(inst.id);

                if (!hasRealPayment) {
                    let finalAmount = parseFloat(inst.amount);
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

        // Build chart months range (fill intermediate months with 0)
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

        let maxValue = chartMonths.length > 0 ? Math.max(...chartMonths.map(m => monthlyCollectedMap[m] || 0)) : 0;
        if (maxValue === 0) maxValue = 1;
        const chartHeight = 220;

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
            maxValue: maxValue * 1.2
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

            {/* ─── Ambient Background Glows ─── */}
            <View style={[
                styles.glowTopRight,
                { backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(236, 72, 153, 0.08)' }
            ]} pointerEvents="none" />
            <View style={[
                styles.glowBottomLeft,
                { backgroundColor: colorScheme === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.05)' }
            ]} pointerEvents="none" />

            <PeriodHeader
                title="Dashboard de Negocio"
                onBack={() => router.back()}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
                <View style={{ overflow: 'hidden' }}>
                    <View style={[styles.header, isTablet && styles.headerTablet]}>

                        {/* 4 KPIs Row */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.kpiScrollView}
                            contentContainerStyle={styles.kpiScrollContent}
                        >
                            <View
                                style={[styles.kpiCard, { 
                                    backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                                    borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border 
                                }]}
                            >
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#4C6EF515' : '#4C6EF530' }]}>
                                    <Users size={22} color="#4C6EF5" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{activeStudentsCount}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Alumnos Activos</Text>
                            </View>

                            <View
                                style={[styles.kpiCard, { 
                                    backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                                    borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border 
                                }]}
                            >
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#12B88615' : '#12B88630' }]}>
                                    <DollarSign size={22} color="#12B886" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{formatCurrency(totalCollected)}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Recaudado</Text>
                            </View>

                            <View
                                style={[styles.kpiCard, { 
                                    backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                                    borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border 
                                }]}
                            >
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#FA525215' : '#FA525230' }]}>
                                    <TrendingUp size={22} color="#FA5252" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{formatCurrency(totalDebt)}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Cuentas X Cobrar</Text>
                            </View>

                            <View
                                style={[styles.kpiCard, { 
                                    marginRight: 40,
                                    backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                                    borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border 
                                }]}
                            >
                                <View style={[styles.kpiIcon, { backgroundColor: colorScheme === 'light' ? '#FAB00515' : '#FAB00530' }]}>
                                    <Award size={22} color="#FAB005" />
                                </View>
                                <Text style={[styles.kpiValue, { color: colors.text }]}>{classes.filter(c => c.cycleId === currentCycleId).length}</Text>
                                <Text style={[styles.kpiLabel, { color: colors.icon }]}>Total Clases</Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>

                <View style={[styles.content, isTablet && styles.contentTablet]}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18 }]}>Salud Financiera ({activeCycle?.name || 'Ciclo Actual'})</Text>

                    <View
                        style={[styles.chartCard, {
                            backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                            borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border,
                        }]}
                    >

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
                                frontColor={colors.tint}
                                isAnimated
                                showFractionalValues={false}
                                backgroundColor="transparent"
                            />
                        </View>
                    </View>

                    <View
                        style={[styles.chartCard, {
                            backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                            borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border,
                        }]}
                    >

                        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 20, alignSelf: 'flex-start', letterSpacing: -0.5 }}>Balance de Cuotas</Text>
                        {totalCollected === 0 && totalDebt === 0 ? (
                            <Text style={{ color: colors.icon, marginVertical: 20 }}>No hay cuotas registradas en este ciclo.</Text>
                        ) : (
                            <View style={{ alignItems: 'center', marginVertical: 10 }}>
                                <View style={{ alignItems: 'center', justifyContent: 'center', height: 260, width: '100%' }}>
                                    <PieChart
                                        key="final-modern-donut"
                                        data={pieChartData}
                                        donut={true}
                                        radius={110}
                                        innerRadius={70}
                                        strokeWidth={2}
                                        strokeColor="transparent"
                                        backgroundColor="transparent"
                                        innerCircleColor="transparent"
                                        centerLabelComponent={() => {
                                            const total = totalCollected + totalDebt;
                                            const totalParts = formatCurrency(total).split('.');
                                            const integerPart = totalParts[0].substring(3);
                                            const decimalPart = totalParts[1];
                                            return (
                                                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                        <Text style={{ fontSize: 16, color: colors.text, fontWeight: '400', marginTop: 10, marginRight: 2 }}>S/</Text>
                                                        <Text style={{ fontSize: 40, color: colors.text, fontWeight: '600', letterSpacing: -1 }}>{integerPart}</Text>
                                                        <Text style={{ fontSize: 16, color: colors.text, fontWeight: '400', marginTop: 10 }}>.{decimalPart}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 13, color: '#888', fontWeight: '500', marginTop: 4 }}>Total consolidado</Text>
                                                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Ciclo: {activeCycle?.name}</Text>
                                                </View>
                                            );
                                        }}
                                        isAnimated
                                        animationDuration={1200}
                                    />
                                </View>
                                {/* Custom Legend */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 25, paddingHorizontal: 15 }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: '#22D3EE', fontWeight: '800', fontSize: 16 }}>{formatCurrency(totalCollected)}</Text>
                                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 4 }}>Recaudado</Text>
                                    </View>

                                    <View style={{ width: 1, backgroundColor: colors.border, opacity: 0.5, marginVertical: 4 }} />

                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: '#C084FC', fontWeight: '800', fontSize: 16 }}>{formatCurrency(totalDebt)}</Text>
                                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 4 }}>Por Cobrar</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Top Classes & Alerts */}
                    <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18, marginLeft: 0 }]}>Top Clases (Ocupación)</Text>

                        {topClasses.length === 0 && <Text style={{ color: colors.icon }}>No hay clases con matrículas.</Text>}
                        {topClasses.map((c, i) => (
                            <View
                                key={c.id}
                                style={[styles.listItem, {
                                    backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                                    borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border
                                }]}
                            >

                                <View style={[styles.listRank, { backgroundColor: i === 0 ? '#FAB005' : i === 1 ? '#adb5bd' : '#cd7f32' }]}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{i + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{c.courseName}</Text>
                                    <Text style={{ color: colors.icon, fontSize: 12 }}>{c.teacherName}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: colors.tint, fontWeight: 'bold' }}>{c.count} / {c.capacity}</Text>
                                    <Text style={{ color: colors.icon, fontSize: 11 }}>{c.percentage.toFixed(0)}% Ocupado</Text>
                                </View>
                            </View>
                        ))}

                        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isTablet ? 24 : 18, marginLeft: 0, marginTop: 20 }]}>Clases en Riesgo (Baja Ocupación)</Text>
                        {emptyClasses.length === 0 && <Text style={{ color: colors.icon }}>No hay clases con baja ocupación.</Text>}
                        {emptyClasses.map(c => (
                            <View
                                key={c.id}
                                style={[styles.listItem, {
                                    backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                                    borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border
                                }]}
                            >

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
                            </View>
                        ))}
                    </View>

                </View>
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    glowTopRight: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        transform: [{ scaleX: 1.5 }],
        opacity: 0.8,
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: -150,
        left: -100,
        width: 350,
        height: 350,
        borderRadius: 175,
        transform: [{ scaleY: 1.2 }],
        opacity: 0.8,
    },
    scrollContent: { flexGrow: 1 },
    header: {
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
    },
    headerTablet: { paddingHorizontal: 40, paddingTop: 20, paddingBottom: 40 },
    kpiScrollView: {
        marginHorizontal: -20,
    },
    kpiScrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 12, // Espacio para que no se corten las sombras
    },
    kpiCard: {
        borderRadius: 20, padding: 20, marginRight: 16,
        width: 160, overflow: 'hidden',
        borderWidth: 1,
        alignItems: 'flex-start',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06, shadowRadius: 14, elevation: Platform.OS === 'android' ? 3 : 5
    },
    kpiIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
    kpiLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
    content: { paddingTop: 24, paddingBottom: 40 },
    contentTablet: { maxWidth: 1000, alignSelf: 'center', width: '100%' },
    sectionTitle: { fontWeight: '800', marginHorizontal: 20, marginBottom: 16, letterSpacing: -0.5 },
    chartCard: {
        marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 15,
        alignItems: 'center', overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06, shadowRadius: 14, elevation: Platform.OS === 'android' ? 3 : 5
    },
    listItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20,
        borderWidth: 1, marginBottom: 14, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: Platform.OS === 'android' ? 3 : 5
    },
    listRank: {
        width: 30, height: 30, borderRadius: 15, justifyContent: 'center',
        alignItems: 'center', marginRight: 15
    }
});
