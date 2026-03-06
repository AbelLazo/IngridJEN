import ModernPicker from '@/components/ModernPicker';
import { Colors } from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { PromotionRule, PromotionType, useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import { AlertCircle, ChevronLeft, Info, Plus, Save, Trash2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PromotionsScreen() {
    const { showAlert } = useAlert();
    const { userRole } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { promotions, addPromotion, updatePromotion, deletePromotion } = useInstitution();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<PromotionRule>>({
        name: '',
        type: 'multi_course',
        minQuantity: 2,
        discountAmount: 10,
        active: true,
    });

    if (userRole !== 'admin') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
                <AlertCircle size={48} color={colors.tint} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso Denegado</Text>
                <Text style={{ color: colors.icon, marginTop: 8 }}>Solo los administradores pueden gestionar promociones.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.tint, borderRadius: 12 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'multi_course',
            minQuantity: 2,
            discountAmount: 10,
            active: true,
        });
        setEditingPromoId(null);
    };

    const handleSave = async () => {
        if (!formData.name?.trim()) {
            showAlert('Error', 'El nombre de la promoción es requerido.');
            return;
        }

        try {
            if (editingPromoId) {
                await updatePromotion({ ...formData, id: editingPromoId } as PromotionRule);
            } else {
                await addPromotion({ ...formData, id: Date.now().toString() } as PromotionRule);
            }
            setModalVisible(false);
            resetForm();
        } catch (error: any) {
            showAlert('Error', 'No se pudo guardar la promoción: ' + error.message);
        }
    };

    const handleEdit = (promo: PromotionRule) => {
        setFormData(promo);
        setEditingPromoId(promo.id);
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        showAlert(
            'Eliminar Promoción',
            '¿Estás seguro de que deseas eliminar esta regla de descuento?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deletePromotion(id)
                }
            ]
        );
    };

    const renderPromoItem = ({ item }: { item: PromotionRule }) => (
        <TouchableOpacity
            style={[styles.promoCard, {
                backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border
            }]}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
        >
            <View style={styles.promoHeader}>
                <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
                    {item.type === 'multi_course' ? (
                        <Plus size={22} color={colors.tint} />
                    ) : item.type === 'family' ? (
                        <AlertCircle size={22} color={colors.tint} />
                    ) : (
                        <Save size={22} color={colors.tint} />
                    )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.promoName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.promoType, { color: colors.icon }]}>
                        {item.type === 'multi_course' ? 'Multi-Curso' : item.type === 'family' ? 'Familiar' : 'Pago Anticipado'}
                    </Text>
                </View>
                <View style={[styles.discountBadge, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.discountText, { color: '#FFF' }]}>S/ {item.discountAmount}</Text>
                </View>
            </View>

            <View style={styles.promoFooter}>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: item.active ? '#4CAF50' : '#F44336' }]} />
                    <Text style={[styles.statusText, { color: colors.icon }]}>{item.active ? 'Regla Activa' : 'Desactivada'}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={[styles.deleteButton, { backgroundColor: '#FF444415' }]}
                >
                    <Trash2 size={18} color="#FF4444" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerShown: false, // We'll use a custom header for the Modern look
            }} />

            <View style={{ height: insets.top + 10 }} />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.backButton, { backgroundColor: colorScheme === 'light' ? '#FFF0F5' : '#FFFFFF20', borderWidth: 1, borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF40' }]}
                    >
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={[styles.greeting, { color: colors.text }]}>Promociones</Text>
                        <View style={[styles.infoChip, { backgroundColor: colorScheme === 'light' ? '#FFF0F5' : '#FFFFFF15' }]}>
                            <Info size={14} color={colors.tint} />
                            <Text style={[styles.infoChipText, { color: colors.text }]}>Reglas de Descuento</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.tint }]}
                        onPress={() => { resetForm(); setModalVisible(true); }}
                    >
                        <Plus color="#fff" size={24} />
                    </TouchableOpacity>
                </View>
            </View>


            <FlatList
                data={promotions}
                renderItem={renderPromoItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={{ color: colors.icon }}>No hay promociones configuradas.</Text>
                    </View>
                }
            />



            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingPromoId ? 'Editar' : 'Nueva'} Promoción
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Nombre descriptivo</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background + '50' }]}>
                                    <Info size={20} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={formData.name}
                                        onChangeText={v => setFormData(prev => ({ ...prev, name: v }))}
                                        placeholder="Ej. Descuento 2x1"
                                        placeholderTextColor={colors.icon}
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Tipo de Regla</Text>
                                <ModernPicker
                                    selectedValue={formData.type || 'multi_course'}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as PromotionType }))}
                                    items={[
                                        { label: 'Multi-Curso (Por volumen)', value: 'multi_course' },
                                        { label: 'Familiar (Hermanos/Parientes)', value: 'family' },
                                        { label: 'Pago Anticipado / Fijo', value: 'fixed' },
                                    ]}
                                    placeholder="Tipo"
                                    title="Regla de Promoción"
                                    colors={colors}
                                />
                            </View>

                            {formData.type === 'multi_course' && (
                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Cantidad mínima de cursos</Text>
                                    <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background + '50' }]}>
                                        <Plus size={20} color={colors.icon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            value={(formData.minQuantity ?? '').toString()}
                                            onChangeText={v => setFormData(prev => ({ ...prev, minQuantity: parseInt(v) || 0 }))}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Monto de Descuento (S/)</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background + '50' }]}>
                                    <Save size={20} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={formData.discountAmount?.toString()}
                                        onChangeText={v => setFormData(prev => ({ ...prev, discountAmount: parseFloat(v) || 0 }))}
                                        keyboardType="numeric"
                                        placeholder="Ej. 15.00"
                                        placeholderTextColor={colors.icon}
                                    />
                                </View>
                            </View>

                            <View style={[styles.formGroup, styles.switchRow]}>
                                <View>
                                    <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>Estado de la Regla</Text>
                                    <Text style={{ fontSize: 12, color: colors.icon }}>Se aplicará automáticamente</Text>
                                </View>
                                <Switch
                                    value={formData.active}
                                    onValueChange={v => setFormData(prev => ({ ...prev, active: v }))}
                                    trackColor={{ false: '#767577', true: colors.tint + '80' }}
                                    thumbColor={formData.active ? colors.tint : '#f4f3f4'}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                                onPress={handleSave}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.saveButtonText}>Guardar Regla</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 4 : 6,
    },
    greeting: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    infoChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 10 },
    infoChipText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
    listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
    promoCard: {
        padding: 16,
        borderRadius: 32,
        borderWidth: 1.5,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    promoHeader: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    promoName: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.3 },
    promoType: { fontSize: 13, fontWeight: '500', opacity: 0.6 },
    discountBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    discountText: { fontWeight: '900', fontSize: 15 },
    promoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1.5, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 12, fontWeight: '600' },
    deleteButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: '60%', maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 18,
        paddingHorizontal: 16,
        height: 56,
    },
    input: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '500' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 16, borderRadius: 20 },
    saveButton: { height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
    saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
