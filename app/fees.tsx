import ModernDatePicker from '@/components/ModernDatePicker';
import PeriodHeader from '@/components/PeriodHeader';
import { Colors } from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import {
    AlertCircle,
    Calendar,
    ChevronDown,
    ChevronUp,
    Coins,
    CreditCard,
    History,
    Info,
    LayoutList,
    Receipt,
    RefreshCcw,
    Search,
    User,
    X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
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
    onRecalculate?: (id: string) => void;
}

const EnrollmentItem = ({ student, detail, colors, onPay, onShowDetail, onRecalculate }: EnrollmentItemProps) => {
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
                        {detail.status !== 'withdrawn' && !detail.isPaid && (
                            <Text style={{ fontSize: 12, color: colors.tint, marginTop: 2, fontWeight: '500' }}>
                                Próximo pago: {detail.nextDate}
                            </Text>
                        )}
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
                    {onRecalculate && (
                        <TouchableOpacity
                            onPress={() => onRecalculate(detail.id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border + '30',
                                marginBottom: 4
                            }}
                        >
                            <RefreshCcw size={14} color={colors.tint} />
                            <Text style={{ marginLeft: 8, color: colors.tint, fontSize: 12, fontWeight: '700' }}>Recalcular Descuentos</Text>
                        </TouchableOpacity>
                    )}
                    {detail.allMonths.map((month: any, idx: number) => (
                        <View key={month.id} style={[styles.monthRow, idx === 0 && { borderTopWidth: 0 }]}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={[styles.monthName, { color: colors.text, opacity: month.isPaid ? 0.6 : 1, flex: 1 }]}>
                                        {month.monthName}
                                    </Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {month.originalAmount && parseFloat(month.originalAmount) > month.amount && (
                                            <Text style={{ fontSize: 11, color: colors.icon, textDecorationLine: 'line-through' }}>
                                                S/ {parseFloat(month.originalAmount).toFixed(2)}
                                            </Text>
                                        )}
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: month.isPaid ? '#40C057' : colors.tint }}>
                                            S/ {month.amount.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={{
                                    fontSize: 11,
                                    color: month.isPaid ? '#40C057' : (month.isOverdue ? '#ff4d4d' : colors.icon),
                                    fontWeight: (month.isOverdue || month.isPaid) ? 'bold' : 'normal',
                                    opacity: month.isPaid ? 0.8 : 1,
                                    marginTop: 2
                                }}>
                                    {month.isPaid ? 'PAGADO ✓' : (month.isOverdue ? 'VENCIDO: ' : 'Vence: ') + month.paymentDate}
                                </Text>
                                {month.notes && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: colors.tint + '10', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                                        <Info size={10} color={colors.tint} />
                                        <Text
                                            style={{ fontSize: 10, color: colors.tint, marginLeft: 4, fontWeight: '600' }}
                                            numberOfLines={1}
                                        >
                                            {month.notes.replace('Descuento automático: ', '').replace('Promoción: ', '🎁 ').replace('Evento: ', '📅 ')}
                                        </Text>
                                    </View>
                                )}
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
                                        { backgroundColor: month.isOverdue ? '#ff4d4d' : colors.tint }
                                    ]}
                                    onPress={() => onPay(student, detail, month)}
                                >
                                    <CreditCard size={14} color="#fff" />
                                    <Text style={styles.payMonthText}>
                                        {month.isOverdue ? 'Pagar Deuda' : 'Pagar mes'}
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
    onRecalculate?: (id: string) => void;
}

const StudentCard = ({ item, colors, onPay, onShowDetail, onRecalculate }: StudentCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const colorScheme = useColorScheme() ?? 'light';

    return (
        <View style={styles.cardContainer}>
            <View style={[
                styles.card,
                {
                    backgroundColor: colorScheme === 'light' ? '#FFFFFF' : '#FFFFFF',
                    borderColor: item.totalDebt > 0 ? '#ff4d4d80' : (colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF'),
                }
            ]}
            >
                <View style={styles.liquidHighlight} />


                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => setIsExpanded(!isExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.avatarBox, { backgroundColor: colors.tint + '15' }]}>
                        <User size={24} color={colors.tint} />
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
                                <EnrollmentItem key={detail.id} student={item} detail={detail} colors={colors} onPay={onPay} onShowDetail={onShowDetail} onRecalculate={onRecalculate} />
                            ))}
                        </View>
                    </>
                )}
            </View>
        </View>
    );
};

export default function FeesScreen() {
    const { showAlert } = useAlert();
    const { userRole } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    if (userRole !== 'admin') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
                <AlertCircle size={48} color={colors.secondary} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso Denegado</Text>
                <Text style={{ color: colors.icon, marginTop: 8 }}>Solo los administradores pueden gestionar las mensualidades.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.tint, borderRadius: 12 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }
    const { students, enrollments, classes, courses, payments, addPayment, installments, academicCycles, currentCycleId, setCurrentCycleId, recalculateEnrollmentInstallments } = useInstitution();

    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'pendientes' | 'historial'>('pendientes');
    const [networkTime, setNetworkTime] = useState<Date | null>(null);

    const [isPayConfirmVisible, setIsPayConfirmVisible] = useState(false);
    const [payData, setPayData] = useState<any>(null);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'contado' | 'yape' | 'transferencia'>('contado');
    const [paymentDate, setPaymentDate] = useState('');
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

    const selectedMonthYear = useMemo(() => {
        const today = networkTime || new Date();
        return today.toISOString().substring(0, 7); // YYYY-MM
    }, [networkTime]);

    const totalPaid = useMemo(() => {
        return payments
            .filter(p => p.monthYear === selectedMonthYear)
            .reduce((acc, p) => acc + parseFloat(p.amount), 0);
    }, [payments, selectedMonthYear]);

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
            const studentEnrollments = enrollments.filter(e => {
                const cls = classes.find(c => c.id === e.classId);
                return e.studentId === student.id && cls?.cycleId === currentCycleId;
            });
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

                    let finalInstAmount = parseFloat(inst.amount);
                    let displayNotes = (inst as any).notes;

                    // Retroactive discount calculation for legacy unpaid installments
                    if (!inst.isPaid && cls?.cycleId) {
                        const activeCycle = academicCycles.find(cy => cy.id === cls.cycleId);
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
                                const eventNames: string[] = [];

                                monthEvents.forEach(e => {
                                    totalDiscountPercentage += e.discountPercentage;
                                    eventNames.push(`${e.name} (${e.discountPercentage}%)`);
                                });

                                if (totalDiscountPercentage > 100) totalDiscountPercentage = 100;

                                // If the current recorded amount equals the full course price, it means
                                // the discount wasn't originally applied at generation time.
                                const coursePrice = parseFloat(course?.price || '0');
                                if (finalInstAmount >= coursePrice) {
                                    const discountAmount = coursePrice * (totalDiscountPercentage / 100);
                                    finalInstAmount = coursePrice - discountAmount;
                                    if (!displayNotes || displayNotes === "") {
                                        displayNotes = `Descuento automático (recuperado): ${eventNames.join(', ')}`;
                                    }
                                }
                            }
                        }
                    }

                    return {
                        id: inst.id,
                        monthName: monthDisplay,
                        paymentDate: inst.dueDate,
                        amount: finalInstAmount,
                        isOverdue,
                        isPaid: inst.isPaid,
                        monthYearSearch: inst.monthYear,
                        paymentRecord,
                        isIgnored: isAfterWithdrawal,
                        notes: displayNotes
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
    }, [students, enrollments, classes, courses, payments, installments, networkTime, currentCycleId]);

    const handleRegisterPayment = (student: any, enrollment: any, month: any) => {
        setPayData({ student, enrollment, month });
        const today = networkTime || new Date();
        setPaymentDate(today.toISOString().split('T')[0]);
        setIsPayConfirmVisible(true);
    };

    const handleShowPaymentDetail = (payment: any, monthName: string, studentName: string, courseName: string) => {
        if (!payment) {
            showAlert("Información", "No se encontró el registro de este pago.");
            return;
        }
        setDetailData({ payment, monthName, studentName, courseName });
        setIsDetailVisible(true);
    };

    const handleRecalculate = (id: string) => {
        showAlert(
            "Recalcular Cuotas",
            "Esto borrará las cuotas no pagadas de esta matrícula y las generará nuevamente aplicando las promociones vigentes. ¿Continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Recalcular",
                    onPress: async () => {
                        await recalculateEnrollmentInstallments(id);
                        showAlert("Éxito", "Cuotas recalculadas correctamente.");
                    }
                }
            ]
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
            onRecalculate={handleRecalculate}
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <PeriodHeader
                title="Mensualidades"
                onBack={() => router.back()}
            />
            {/* Toggles */}
            <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'pendientes' && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setViewMode('pendientes')}
                >
                    <LayoutList size={20} color={viewMode === 'pendientes' ? '#fff' : colors.icon} />
                    <Text style={[styles.toggleLabel, { color: viewMode === 'pendientes' ? '#fff' : colors.icon }]}>Próximos Cobros</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'historial' && { backgroundColor: colors.tint }
                    ]}
                    onPress={() => setViewMode('historial')}
                >
                    <History size={20} color={viewMode === 'historial' ? '#fff' : colors.icon} />
                    <Text style={[styles.toggleLabel, { color: viewMode === 'historial' ? '#fff' : colors.icon }]}>Historial de Caja</Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'pendientes' ? (
                <>
                    <View style={styles.summaryContainer}>
                        <View style={[
                            styles.summaryItem,
                            {
                                backgroundColor: colorScheme === 'light' ? '#FFFFFF' : '#FFFFFF',
                                borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF',
                            }
                        ]}
                        >
                            <View style={styles.liquidHighlight} />

                            <View style={[styles.avatarBox, { backgroundColor: '#40C05715' }]}>
                                <Receipt size={24} color="#40C057" />
                            </View>
                            <View style={styles.summaryInfo}>
                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>Total Recaudado ({selectedMonthYear})</Text>
                                <Text style={[styles.summaryValue, { color: '#40C057' }]}>S/ {totalPaid}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.summaryContainer}>
                        <View style={[
                            styles.summaryItem,
                            {
                                backgroundColor: colorScheme === 'light' ? '#FFFFFF' : '#FFFFFF',
                                borderColor: cycleTotalDebt > 0 ? '#ff4d4d80' : (colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF'),
                            }
                        ]}
                        >
                            <View style={styles.liquidHighlight} />

                            <View style={[styles.avatarBox, { backgroundColor: '#ff4d4d15' }]}>
                                <Coins size={24} color="#ff4d4d" />
                            </View>
                            <View style={styles.summaryInfo}>
                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>Deuda Ciclo Seleccionado</Text>
                                <Text style={[styles.summaryValue, { color: '#ff4d4d' }]}>S/ {cycleTotalDebt}</Text>
                            </View>
                        </View>
                    </View>


                    <View style={[
                        styles.searchContainer,
                        {
                            backgroundColor: colorScheme === 'light' ? '#FFFFFF' : '#FFFFFF',
                            borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF',
                        }
                    ]}
                    >
                        <View style={styles.liquidHighlight} />
                        <Search color={colors.tint} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Buscar estudiante..."
                            placeholderTextColor={colorScheme === 'light' ? '#999' : '#777'}
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
                    <View style={[
                        styles.searchContainer,
                        {
                            backgroundColor: colorScheme === 'light' ? '#FFFFFF' : '#FFFFFF',
                            borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF',
                            marginTop: 10
                        }
                    ]}
                    >
                        <View style={styles.liquidHighlight} />
                        <Search color={colors.tint} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Buscar en historial..."
                            placeholderTextColor={colorScheme === 'light' ? '#999' : '#777'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <FlatList
                        data={payments.filter(p => {
                            const student = students.find(s => s.id === p.studentId);
                            const fullName = `${student?.firstName} ${student?.lastName}`.toLowerCase();
                            const matchesSearch = fullName.includes(searchQuery.toLowerCase());
                            // Filter by selected cycle
                            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
                            const cls = enrollment ? classes.find(c => c.id === enrollment.classId) : null;
                            const matchesCycle = cls?.cycleId === currentCycleId;
                            return matchesSearch && matchesCycle;
                        }).sort((a, b) => b.id.localeCompare(a.id))}
                        renderItem={({ item }) => {
                            const student = students.find(s => s.id === item.studentId);
                            const enrollment = enrollments.find(e => e.id === item.enrollmentId);
                            const cls = classes.find(c => c.id === enrollment?.classId);
                            return (
                                <View style={styles.cardContainer}>
                                    <View style={[
                                        styles.historyCard,
                                        {
                                            backgroundColor: colorScheme === 'light' ? '#FFFFFF' : '#FFFFFF',
                                            borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF',
                                        }
                                    ]}
                                    >
                                        <View style={styles.liquidHighlight} />

                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center' }}
                                            onPress={() => handleShowPaymentDetail(item, item.monthYear, `${student?.firstName} ${student?.lastName}`, cls?.courseName || 'Desconocido')}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.avatarBox, { backgroundColor: colors.tint + '10', width: 40, height: 40 }]}>
                                                <Calendar size={18} color={colors.tint} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={[styles.historyName, { color: colors.text }]}>{student?.firstName} {student?.lastName}</Text>
                                                <Text style={{ fontSize: 12, color: colors.icon }}>{cls?.courseName} • Período: {item.monthYear}</Text>
                                                <Text style={{ fontSize: 11, color: colors.tint, textTransform: 'capitalize', marginTop: 2 }}>{item.method || 'Contado'}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[styles.historyAmount, { color: '#40C057' }]}>+ S/ {item.amount}</Text>
                                                <Text style={{ fontSize: 10, color: colors.icon }}>{item.date}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>
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

            {/* Modal Confirmar Pago */}
            <Modal visible={isPayConfirmVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal, borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar Pago</Text>
                            <TouchableOpacity onPress={() => setIsPayConfirmVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        {payData && (
                            <Text style={{ color: colors.text, marginBottom: 20, fontSize: 16, lineHeight: 24 }}>
                                ¿Confirmas el pago de <Text style={{ fontWeight: 'bold' }}>S/ {payData.month.amount}</Text> por "{payData.enrollment.courseName}" correspondiente a {payData.month.monthName} para {payData.student.firstName}?
                                {payData.month.notes ? `\n\n(${payData.month.notes})` : ''}
                            </Text>
                        )}

                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 10 }}>Fecha del pago:</Text>
                        <TouchableOpacity
                            onPress={() => setIsDatePickerVisible(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.tint + '08',
                                marginBottom: 16
                            }}
                        >
                            <Calendar size={18} color={colors.tint} />
                            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginLeft: 10 }}>
                                {paymentDate ? paymentDate.split('-').reverse().join('/') : 'Seleccionar fecha'}
                            </Text>
                            <Text style={{ color: colors.icon, fontSize: 11, marginLeft: 'auto' }}>Cambiar</Text>
                        </TouchableOpacity>

                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 10 }}>Método de pago:</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                            {['contado', 'yape', 'transferencia'].map(method => (
                                <TouchableOpacity
                                    key={method}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 10,
                                        marginHorizontal: 4,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: paymentMethod === method ? colors.tint : colors.border,
                                        backgroundColor: paymentMethod === method ? colors.tint + '15' : 'transparent',
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setPaymentMethod(method as any)}
                                >
                                    <Text style={{ color: paymentMethod === method ? colors.tint : colors.icon, textTransform: 'capitalize', fontWeight: paymentMethod === method ? 'bold' : 'normal', fontSize: 12 }}>
                                        {method}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.border, flex: 1, marginRight: 10 }]}
                                onPress={() => setIsPayConfirmVisible(false)}
                            >
                                <Text style={[styles.saveText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.tint, flex: 1, marginLeft: 10 }]}
                                onPress={() => {
                                    if (payData) {
                                        addPayment({
                                            id: Date.now().toString(),
                                            studentId: payData.student.id,
                                            enrollmentId: payData.enrollment.id,
                                            installmentId: payData.month.id,
                                            amount: payData.month.amount.toString(),
                                            date: paymentDate,
                                            monthYear: payData.month.monthYearSearch,
                                            method: paymentMethod
                                        }, payData.month.id);
                                        setIsPayConfirmVisible(false);
                                        setPayData(null);
                                        setPaymentMethod('contado'); // Reset after paying
                                    }
                                }}
                            >
                                <Text style={styles.saveText}>Confirmar Pago</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Date Picker for Payment Date */}
            <ModernDatePicker
                mode="single"
                visible={isDatePickerVisible}
                startDate={paymentDate}
                title="Fecha del Pago"
                onConfirm={(date) => {
                    setPaymentDate(date);
                    setIsDatePickerVisible(false);
                }}
                onCancel={() => setIsDatePickerVisible(false)}
            />

            {/* Modal Detalles de Pago */}
            <Modal visible={isDetailVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Detalles del Pago</Text>
                            <TouchableOpacity onPress={() => setIsDetailVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        {detailData && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Estudiante:</Text> {detailData.studentName}</Text>
                                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Curso:</Text> {detailData.courseName}</Text>
                                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Mes:</Text> {detailData.monthName}</Text>
                                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Monto procesado:</Text> S/ {detailData.payment.amount}</Text>
                                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Método de pago:</Text> <Text style={{ textTransform: 'capitalize' }}>{detailData.payment.method || 'contado'}</Text></Text>
                                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Fecha del pago:</Text> {new Date(detailData.payment.date + 'T12:00:00').toLocaleDateString('es-PE')}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.tint, width: '100%', marginTop: 10 }]}
                            onPress={() => setIsDetailVisible(false)}
                        >
                            <Text style={styles.saveText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: Platform.OS === 'android' ? 0 : 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    saveButton: { height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    saveText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    placeholder: { width: 38 },
    summaryContainer: { paddingHorizontal: 20, marginBottom: 15 },
    summaryItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, borderWidth: 1.5, overflow: 'hidden' },
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
        borderRadius: 32,
        borderWidth: 1,
        marginRight: 8
    },
    cycleChipLabel: { marginLeft: 6, fontWeight: '700', fontSize: 13 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        height: 52,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 15,
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '500',
    },
    listContent: { paddingHorizontal: 20 },
    cardContainer: {
        marginBottom: 16,
        marginHorizontal: 4,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 0 : 4,
    },
    card: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },

    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    avatarBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, marginLeft: 15 },
    studentName: { fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
    classCount: { fontSize: 13 },
    amountBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
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
        borderRadius: 12,
    },
    payMonthText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 16, marginTop: 10 },
    payButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    toggleContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 20 },
    toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
    toggleLabel: { marginLeft: 8, fontWeight: '600', fontSize: 14 },
    historyCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, marginBottom: 12, borderWidth: 1 },
    historyName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
    historyAmount: { fontSize: 16, fontWeight: '800' },
    liquidHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
});