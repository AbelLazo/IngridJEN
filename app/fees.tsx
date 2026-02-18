import { Colors } from '@/constants/theme';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import {
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Coins,
    CreditCard,
    History,
    Receipt,
    Search,
    User
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EnrollmentItemProps {
    student: any;
    detail: any;
    colors: any;
    onPay: (student: any, enrollment: any, month: any) => void;
    onShowDetail: (payment: any, monthName: string, studentName: string, courseName: string) => void;
}

const EnrollmentItem = ({ student, detail, colors, onPay, onShowDetail }: EnrollmentItemProps) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.detailCard}>
            <TouchableOpacity
                style={styles.detailRow}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.detailLeft}>
                    <View style={[styles.dot, { backgroundColor: detail.isPaid ? '#40C057' : '#ff4d4d' }]} />
                    <View>
                        <Text style={[styles.courseNameText, { color: colors.text }]} numberOfLines={1}>
                            {detail.courseName}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.icon }}>
                            {detail.status === 'withdrawn' ? (
                                <Text style={{ color: '#ff4d4d', fontWeight: 'bold' }}>RETIRADO</Text>
                            ) : (
                                detail.isPaid ? 'Al día' : `Deuda: S/ ${detail.debt}`
                            )}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.priceText, { color: colors.icon, marginRight: 8 }]}>
                        S/ {detail.monthlyPrice}/mes
                    </Text>
                    {expanded ? <ChevronUp size={20} color={colors.icon} /> : <ChevronDown size={20} color={colors.icon} />}
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandableContent}>
                    {detail.allMonths.map((month: any, idx: number) => (
                        <View key={month.id} style={[styles.monthRow, idx === 0 && { borderTopWidth: 0 }]}>
                            <View>
                                <Text style={[styles.monthName, { color: colors.text, opacity: month.isPaid ? 0.6 : 1 }]}>
                                    {month.monthName}
                                </Text>
                                <Text style={{
                                    fontSize: 11,
                                    color: month.isPaid ? '#40C057' : (month.isOverdue ? '#ff4d4d' : colors.icon),
                                    fontWeight: (month.isOverdue || month.isPaid) ? 'bold' : 'normal',
                                    opacity: month.isPaid ? 0.8 : 1
                                }}>
                                    {month.isPaid ? 'PAGADO ✓' : (month.isOverdue ? 'VENCIDO: ' : 'Vence: ') + month.paymentDate}
                                </Text>
                            </View>

                            {month.isPaid ? (
                                <TouchableOpacity
                                    style={[styles.payMonthButton, { backgroundColor: '#40C05715' }]}
                                    onPress={() => onShowDetail(month.paymentRecord, month.monthName, `${student.firstName} ${student.lastName}`, detail.courseName)}
                                >
                                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#40C057', justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                                    </View>
                                    <Text style={[styles.payMonthText, { color: '#40C057', marginLeft: 8 }]}>Info Pago</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        styles.payMonthButton,
                                        { backgroundColor: month.isOverdue ? '#ff4d4d' : colors.primary }
                                    ]}
                                    onPress={() => onPay(student, detail, month)}
                                >
                                    <CreditCard size={14} color="#fff" />
                                    <Text style={styles.payMonthText}>
                                        {month.isOverdue ? 'Pagar Deuda' : 'Adelantar'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

interface StudentCardProps {
    item: any;
    colors: any;
    onPay: (student: any, enrollment: any, month: any) => void;
    onShowDetail: (payment: any, monthName: string, studentName: string, courseName: string) => void;
}

const StudentCard = ({ item, colors, onPay, onShowDetail }: StudentCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: item.totalDebt > 0 ? '#ff4d4d' + '40' : colors.border }]}>
            <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setIsExpanded(!isExpanded)}
                activeOpacity={0.7}
            >
                <View style={[styles.avatarBox, { backgroundColor: colors.primary + '15' }]}>
                    <User size={24} color={colors.primary} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.studentName, { color: colors.text }]}>
                        {item.firstName} {item.lastName}
                    </Text>
                    <Text style={[styles.classCount, { color: item.totalDebt > 0 ? '#ff4d4d' : colors.icon }]}>
                        {item.totalDebt > 0 ? `Deuda Total: S/ ${item.totalDebt}` : 'Todo pagado'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.totalDebt > 0 && !isExpanded && (
                        <View style={[styles.amountBadge, { backgroundColor: '#ff4d4d15', marginRight: 8 }]}>
                            <Text style={[styles.totalAmount, { color: '#ff4d4d', fontSize: 14 }]}>
                                S/ {item.totalDebt}
                            </Text>
                        </View>
                    )}
                    {isExpanded ? <ChevronUp size={24} color={colors.icon} /> : <ChevronDown size={24} color={colors.icon} />}
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.detailsList}>
                        <Text style={[styles.sectionTitle, { color: colors.icon }]}>Cursos Matriculados:</Text>
                        {item.enrollmentDetails.map((detail: any) => (
                            <EnrollmentItem key={detail.id} student={item} detail={detail} colors={colors} onPay={onPay} onShowDetail={onShowDetail} />
                        ))}
                    </View>
                </>
            )}
        </View>
    );
};

export default function FeesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { students, enrollments, classes, courses, payments, addPayment, installments, academicCycles, currentCycleId, setCurrentCycleId } = useInstitution();

    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'pendientes' | 'historial'>('pendientes');
    const [networkTime, setNetworkTime] = useState<Date | null>(null);

    React.useEffect(() => {
        const fetchTime = async () => {
            try {
                const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=America/Lima');
                const data = await response.json();
                if (data && data.dateTime) {
                    setNetworkTime(new Date(data.dateTime));
                }
            } catch (error) {
                setNetworkTime(new Date());
            }
        };
        fetchTime();
    }, []);

    const studentFees = useMemo(() => {
        const today = networkTime || new Date();
        const todayStr = today.toISOString().split('T')[0];

        return students.map(student => {
            const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
            let totalToPay = 0;

            const enrollmentDetails = studentEnrollments.map(enrol => {
                const cls = classes.find(c => c.id === enrol.classId);
                const course = courses.find(co => co.id === cls?.courseId);

                const enrolInstallments = installments
                    .filter(inst => inst.enrollmentId === enrol.id)
                    .sort((a, b) => a.monthYear.localeCompare(b.monthYear));

                const monthsData = enrolInstallments.map(inst => {
                    const paymentRecord = payments.find(p => p.id === inst.paymentId);
                    const dateParts = inst.monthYear.split('-');
                    const monthDisplay = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, 1).toLocaleString('es-PE', { month: 'long', year: 'numeric' });

                    // Logic to ignore installments after withdrawal
                    let isAfterWithdrawal = false;
                    if (enrol.status === 'withdrawn' && enrol.withdrawalDate) {
                        const withdrawMonthYear = enrol.withdrawalDate.substring(0, 7); // "YYYY-MM"
                        if (inst.monthYear > withdrawMonthYear) {
                            isAfterWithdrawal = true;
                        }
                    }

                    const isOverdue = inst.dueDate <= todayStr && !inst.isPaid && !isAfterWithdrawal;

                    return {
                        id: inst.id,
                        monthName: monthDisplay,
                        paymentDate: inst.dueDate,
                        amount: parseFloat(inst.amount),
                        isOverdue,
                        isPaid: inst.isPaid,
                        monthYearSearch: inst.monthYear,
                        paymentRecord,
                        isIgnored: isAfterWithdrawal
                    };
                }).filter(m => !m.isIgnored); // Only show relevant months for the student's status

                const debt = monthsData.reduce((acc, curr) => curr.isOverdue ? acc + curr.amount : acc, 0);
                totalToPay += debt;

                const nextUnpaid = monthsData.find(m => !m.isPaid);

                return {
                    id: enrol.id,
                    status: enrol.status || 'active',
                    courseName: course?.name || 'Desconocido',
                    monthlyPrice: parseFloat(course?.price || '0'),
                    debt: debt,
                    nextDate: nextUnpaid ? nextUnpaid.paymentDate : 'N/A',
                    isPaid: !monthsData.some(m => !m.isPaid),
                    allMonths: monthsData,
                    cycleId: cls?.cycleId
                };
            });

            return {
                ...student,
                enrollmentDetails,
                totalDebt: totalToPay,
            };
        }).filter(s => s.enrollmentDetails.length > 0)
            .sort((a, b) => b.totalDebt - a.totalDebt);
    }, [students, enrollments, classes, courses, payments, installments, networkTime]);

    const handleRegisterPayment = (student: any, enrollment: any, month: any) => {
        const today = networkTime || new Date();
        const monthYear = month.monthYearSearch;

        Alert.alert(
            "Registrar Pago",
            `¿Confirmas el pago de S/ ${month.amount} por "${enrollment.courseName}" correspondiente a ${month.monthName} para ${student.firstName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar Pago",
                    onPress: () => {
                        addPayment({
                            id: Date.now().toString(),
                            studentId: student.id,
                            enrollmentId: enrollment.id,
                            installmentId: month.id,
                            amount: month.amount.toString(),
                            date: today.toISOString().split('T')[0],
                            monthYear: monthYear
                        }, month.id);
                    }
                }
            ]
        );
    };

    const handleShowPaymentDetail = (payment: any, monthName: string, studentName: string, courseName: string) => {
        if (!payment) {
            Alert.alert("Información", "No se encontró el registro de este pago.");
            return;
        }

        Alert.alert(
            "Detalles del Pago",
            `Estudiante: ${studentName}\n` +
            `Curso: ${courseName}\n` +
            `Mes: ${monthName}\n\n` +
            `Monto procesado: S/ ${payment.amount}\n` +
            `Fecha del pago: ${new Date(payment.date + 'T12:00:00').toLocaleDateString('es-PE')}`,
            [{ text: "Cerrar", style: "default" }]
        );
    };

    const filteredFees = useMemo(() => {
        return studentFees.filter(item => {
            const matchesSearch = `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());

            const hasVisibleEnrollments = item.enrollmentDetails.some((d: any) => d.cycleId === currentCycleId);
            if (!hasVisibleEnrollments) return false;

            if (viewMode === 'pendientes') {
                const hasActiveEnrollment = item.enrollmentDetails.some((d: any) => d.status === 'active' && d.cycleId === currentCycleId);
                const cycleDebt = item.enrollmentDetails
                    .filter((d: any) => d.cycleId === currentCycleId)
                    .reduce((acc: number, curr: any) => acc + curr.debt, 0);

                return matchesSearch && (hasActiveEnrollment || cycleDebt > 0);
            }
            return matchesSearch;
        });
    }, [studentFees, searchQuery, viewMode, currentCycleId]);

    const cycleTotalDebt = useMemo(() => {
        return studentFees.reduce((acc, student) => {
            const studentCycleDebt = student.enrollmentDetails
                .filter((d: any) => d.cycleId === currentCycleId)
                .reduce((sum: number, d: any) => sum + d.debt, 0);
            return acc + studentCycleDebt;
        }, 0);
    }, [studentFees, currentCycleId]);

    const renderItem = ({ item }: { item: any }) => (
        <StudentCard
            item={item}
            colors={colors}
            onPay={handleRegisterPayment}
            onShowDetail={handleShowPaymentDetail}
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Mensualidades</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <TouchableOpacity
                    onPress={() => setViewMode('pendientes')}
                    style={[styles.toggleButton, viewMode === 'pendientes' && { backgroundColor: colors.primary }]}
                >
                    <Receipt size={18} color={viewMode === 'pendientes' ? '#fff' : colors.icon} />
                    <Text style={[styles.toggleLabel, { color: viewMode === 'pendientes' ? '#fff' : colors.icon }]}>Próximos Cobros</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setViewMode('historial')}
                    style={[styles.toggleButton, viewMode === 'historial' && { backgroundColor: colors.primary }]}
                >
                    <History size={18} color={viewMode === 'historial' ? '#fff' : colors.icon} />
                    <Text style={[styles.toggleLabel, { color: viewMode === 'historial' ? '#fff' : colors.icon }]}>Historial de Caja</Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'pendientes' ? (
                <>
                    <View style={styles.summaryContainer}>
                        <View style={[styles.summaryItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Receipt size={20} color={colors.primary} />
                            <View style={styles.summaryInfo}>
                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>Deuda Ciclo Seleccionado</Text>
                                <Text style={[styles.summaryValue, { color: '#ff4d4d' }]}>
                                    S/ {cycleTotalDebt}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Cycle Selector - Horizontal Scroll for more space */}
                    <View style={styles.cycleSelectorWrapper}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cycleScrollContent}
                        >
                            {academicCycles.map(cycle => (
                                <TouchableOpacity
                                    key={cycle.id}
                                    onPress={() => setCurrentCycleId(cycle.id)}
                                    style={[
                                        styles.cycleChip,
                                        { backgroundColor: colors.card, borderColor: colors.border },
                                        currentCycleId === cycle.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                >
                                    <Calendar
                                        size={16}
                                        color={currentCycleId === cycle.id ? '#fff' : colors.icon}
                                    />
                                    <Text style={[
                                        styles.cycleChipLabel,
                                        { color: currentCycleId === cycle.id ? '#fff' : colors.icon }
                                    ]}>
                                        {cycle.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Search color={colors.icon} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Buscar estudiante..."
                            placeholderTextColor={colors.icon}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <FlatList
                        data={filteredFees}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Coins size={48} color={colors.icon + '40'} />
                                <Text style={{ color: colors.icon, marginTop: 10 }}>No hay cobros pendientes.</Text>
                            </View>
                        }
                    />
                </>
            ) : (
                <>
                    <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
                        <Search color={colors.icon} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Buscar en el historial..."
                            placeholderTextColor={colors.icon}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <FlatList
                        data={payments.filter(p => {
                            const student = students.find(s => s.id === p.studentId);
                            const fullName = `${student?.firstName} ${student?.lastName}`.toLowerCase();
                            return fullName.includes(searchQuery.toLowerCase());
                        }).sort((a, b) => b.id.localeCompare(a.id))}
                        renderItem={({ item }) => {
                            const student = students.find(s => s.id === item.studentId);
                            const enrollment = enrollments.find(e => e.id === item.enrollmentId);
                            const cls = classes.find(c => c.id === enrollment?.classId);
                            return (
                                <TouchableOpacity
                                    style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => handleShowPaymentDetail(item, item.monthYear, `${student?.firstName} ${student?.lastName}`, cls?.courseName || 'Desconocido')}
                                >
                                    <View style={[styles.avatarBox, { backgroundColor: colors.primary + '10', width: 40, height: 40 }]}>
                                        <Calendar size={18} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.historyName, { color: colors.text }]}>{student?.firstName} {student?.lastName}</Text>
                                        <Text style={{ fontSize: 12, color: colors.icon }}>{cls?.courseName} • Período: {item.monthYear}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.historyAmount, { color: '#40C057' }]}>+ S/ {item.amount}</Text>
                                        <Text style={{ fontSize: 10, color: colors.icon }}>{item.date}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        keyExtractor={item => item.id}
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Coins size={48} color={colors.icon + '40'} />
                                <Text style={{ color: colors.icon, marginTop: 10 }}>No se han registrado pagos aún.</Text>
                            </View>
                        }
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    placeholder: { width: 38 },
    summaryContainer: { paddingHorizontal: 20, marginBottom: 15 },
    summaryItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1 },
    summaryInfo: { marginLeft: 15 },
    summaryLabel: { fontSize: 13, marginBottom: 2 },
    summaryValue: { fontSize: 20, fontWeight: '800' },
    cycleSelectorWrapper: { marginBottom: 15 },
    cycleScrollContent: { paddingHorizontal: 20, gap: 10 },
    cycleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8
    },
    cycleChipLabel: { marginLeft: 6, fontWeight: '700', fontSize: 13 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 15, paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    listContent: { paddingHorizontal: 20 },
    card: { borderRadius: 28, padding: 20, marginBottom: 18, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    avatarBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, marginLeft: 15 },
    studentName: { fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
    classCount: { fontSize: 13 },
    amountBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    totalAmount: { fontSize: 18, fontWeight: '800' },
    divider: { height: 1, marginVertical: 12 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    detailsList: { marginBottom: 5 },
    detailCard: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    detailLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    courseNameText: { fontSize: 15, fontWeight: '600', flex: 1 },
    priceText: { fontSize: 14, fontWeight: '500' },
    expandableContent: {
        marginTop: 10,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 12,
        overflow: 'hidden',
    },
    monthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    monthName: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    payMonthButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    payMonthText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, marginTop: 10 },
    payButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    toggleContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 15, padding: 4, marginBottom: 20 },
    toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
    toggleLabel: { marginLeft: 8, fontWeight: '700', fontSize: 14 },
    historyCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 12, borderWidth: 1 },
    historyName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
    historyAmount: { fontSize: 16, fontWeight: '800' }
});
