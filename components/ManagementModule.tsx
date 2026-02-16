import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Phone, Plus, Search, UserPlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInstitution } from '@/context/InstitutionContext';

interface Entity {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    specialties?: string[];
    type: 'student' | 'teacher';
}

interface ManagementModuleProps {
    title: string;
    type: 'student' | 'teacher';
    placeholderExtra?: string;
    iconExtra?: any;
}

export default function ManagementModule({ title, type, placeholderExtra, iconExtra: IconExtra }: ManagementModuleProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { courses } = useInstitution();

    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [entities, setEntities] = useState<Entity[]>([
        {
            id: '1',
            firstName: type === 'student' ? 'Juan' : 'Carlos',
            lastName: type === 'student' ? 'Pérez' : 'Ruíz',
            phone: '999123456',
            specialties: type === 'student' ? undefined : ['Matemáticas Avanzadas'],
            type
        },
    ]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        selectedSpecialties: [] as string[]
    });

    const handleToggleSpecialty = (name: string) => {
        setFormData(prev => ({
            ...prev,
            selectedSpecialties: prev.selectedSpecialties.includes(name)
                ? prev.selectedSpecialties.filter(s => s !== name)
                : [...prev.selectedSpecialties, name]
        }));
    };

    const filteredEntities = entities.filter(item =>
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery)
    );

    const handleAdd = () => {
        if (formData.firstName && formData.lastName && formData.phone) {
            const newEntity: Entity = {
                id: Date.now().toString(),
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                specialties: type === 'teacher' ? formData.selectedSpecialties : undefined,
                type
            };
            setEntities([newEntity, ...entities]);
            setFormData({ firstName: '', lastName: '', phone: '', selectedSpecialties: [] });
            setModalVisible(false);
        }
    };

    const renderItem = ({ item }: { item: Entity }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{item.firstName.charAt(0)}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardName, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
                <View style={styles.cardInfoRow}>
                    <Phone size={14} color={colors.icon} />
                    <Text style={[styles.cardSub, { color: colors.icon, marginLeft: 4 }]}>{item.phone}</Text>
                </View>
                {item.specialties && item.specialties.length > 0 && (
                    <View style={styles.specialtyTags}>
                        {item.specialties.map((s, idx) => (
                            <View key={idx} style={[styles.miniBadge, { backgroundColor: colors.primary + '10' }]}>
                                <Text style={[styles.miniBadgeText, { color: colors.primary }]}>{s}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => setModalVisible(true)}
                >
                    <Plus color="#fff" size={24} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Search color={colors.icon} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar por nombre o celular..."
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            <FlatList
                data={filteredEntities}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: colors.icon }}>No se encontraron resultados.</Text>
                    </View>
                }
            />

            {/* Add Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Registrar {title.slice(0, -1)}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Nombres</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                    <UserPlus size={18} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. Juan Alberto"
                                        placeholderTextColor={colors.icon}
                                        value={formData.firstName}
                                        onChangeText={(v) => setFormData({ ...formData, firstName: v })}
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Apellidos</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                    <UserPlus size={18} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. Pérez García"
                                        placeholderTextColor={colors.icon}
                                        value={formData.lastName}
                                        onChangeText={(v) => setFormData({ ...formData, lastName: v })}
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Teléfono</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                    <Phone size={18} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Número de contacto"
                                        placeholderTextColor={colors.icon}
                                        keyboardType="phone-pad"
                                        value={formData.phone}
                                        onChangeText={(v) => setFormData({ ...formData, phone: v })}
                                    />
                                </View>
                            </View>

                            {type === 'teacher' && (
                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Especialidades (Cursos)</Text>
                                    <View style={styles.specialtiesSelector}>
                                        {courses.length > 0 ? (
                                            courses.map(course => (
                                                <TouchableOpacity
                                                    key={course.id}
                                                    style={[
                                                        styles.specialtyChip,
                                                        { borderColor: colors.border },
                                                        formData.selectedSpecialties.includes(course.name) && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                    ]}
                                                    onPress={() => handleToggleSpecialty(course.name)}
                                                >
                                                    <Text style={[
                                                        styles.specialtyChipText,
                                                        { color: colors.text },
                                                        formData.selectedSpecialties.includes(course.name) && { color: '#fff' }
                                                    ]}>{course.name}</Text>
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <Text style={{ color: colors.icon, fontSize: 13 }}>No hay cursos creados para asignar.</Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                onPress={handleAdd}
                            >
                                <Text style={styles.submitButtonText}>Guardar Registro</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        paddingHorizontal: 15,
        height: 50,
        borderRadius: 15,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    cardContent: {
        flex: 1,
        marginLeft: 15,
    },
    cardName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    cardSub: {
        fontSize: 13,
    },
    cardInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    specialtyTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    miniBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginRight: 6,
        marginBottom: 6,
    },
    miniBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    specialtiesSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
    },
    specialtyChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    specialtyChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 55,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
    },
    submitButton: {
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        elevation: 4,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
