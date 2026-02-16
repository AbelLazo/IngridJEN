import { Colors } from '@/constants/theme';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, CreditCard, DollarSign, Receipt, Search, User } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FeesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { students, enrollments, classes, courses } = useInstitution();

    const [searchQuery, setSearchQuery] = useState('');

    const studentFees = useMemo(() => {
        return students.map(student => {
            const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
            const enrolledClasses = studentEnrollments.map(e => classes.find(c => c.id === e.classId)).filter(Boolean);

            let totalFee = 0;
            const details = enrolledClasses.map(cls => {
                const course = courses.find(co => co.id === cls!.courseId);
                const price = parseFloat(course?.price || '0');
                totalFee += price;
                return {
                    courseName: course?.name || 'Desconocido',
                    price: price
                };
            });

            return {
                ...student,
                totalClasses: enrolledClasses.length,
                totalAmount: totalFee,
                details
            };
        }).filter(s => s.totalClasses > 0); // Only show students with classes
    }, [students, enrollments, classes, courses]);

    const filteredFees = studentFees.filter(item =>
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: typeof studentFees[0] }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.avatarBox, { backgroundColor: colors.primary + '15' }]}>
                    <User size={24} color={colors.primary} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.studentName, { color: colors.text }]}>
                        {item.firstName} {item.lastName}
                    </Text>
                    <Text style={[styles.classCount, { color: colors.icon }]}>
                        {item.totalClasses} {item.totalClasses === 1 ? 'Clase' : 'Clases'} inscritas
                    </Text>
                </View>
                <View style={styles.amountBadge}>
                    <Text style={[styles.totalAmount, { color: colors.primary }]}>
                        ${item.totalAmount}
                    </Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailsList}>
                {item.details.map((detail, index) => (
                    <View key={index} style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.courseNameText, { color: colors.text }]} numberOfLines={1}>
                                {detail.courseName}
                            </Text>
                        </View>
                        <Text style={[styles.priceText, { color: colors.icon }]}>
                            ${detail.price}
                        </Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={[styles.payButton, { backgroundColor: colors.primary }]}>
                <CreditCard size={18} color="#fff" />
                <Text style={styles.payButtonText}>Registrar Pago</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Mensualidades</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Stats Summary */}
            <View style={styles.summaryContainer}>
                <View style={[styles.summaryItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Receipt size={20} color={colors.primary} />
                    <View style={styles.summaryInfo}>
                        <Text style={[styles.summaryLabel, { color: colors.icon }]}>Total Facturado</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                            ${studentFees.reduce((acc, curr) => acc + curr.totalAmount, 0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Search */}
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
                        <DollarSign size={48} color={colors.icon + '40'} />
                        <Text style={{ color: colors.icon, marginTop: 10 }}>No hay cobros pendientes.</Text>
                    </View>
                }
            />
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
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1 },
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
    detailsList: { marginBottom: 15 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    detailLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
    courseNameText: { fontSize: 14, fontWeight: '500', flex: 1 },
    priceText: { fontSize: 14, fontWeight: '600' },
    payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, marginTop: 10 },
    payButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
    emptyContainer: { alignItems: 'center', marginTop: 100 }
});

