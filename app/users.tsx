import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Check, ChevronDown, Clock, ShieldAlert, ShieldCheck, Trash2, User as UserIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../hooks/use-color-scheme';

interface AppUser {
    id: string;
    email: string;
    role: 'admin' | 'professor' | null;
    createdAt?: string;
}

export default function UsersScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { width } = useWindowDimensions();
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const appColors = {
        background: isDark ? '#111827' : '#F3F4F6',
        card: isDark ? '#1F2937' : '#FFFFFF',
        text: isDark ? '#F9FAFB' : '#111827',
        textMuted: isDark ? '#9CA3AF' : '#6B7280',
        primary: '#3B82F6',
        border: isDark ? '#374151' : '#E5E7EB',
        inputBg: isDark ? '#374151' : '#F9FAFB',
    };

    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // Real-time listener for the users collection
        const q = query(collection(db, 'users'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData: AppUser[] = [];
            snapshot.forEach((doc) => {
                usersData.push({
                    id: doc.id,
                    ...doc.data()
                } as AppUser);
            });
            // Sort by email or creation date
            usersData.sort((a, b) => a.email.localeCompare(b.email));

            setUsers(usersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            Alert.alert("Error", "No se pudieron cargar los usuarios.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRoleChange = async (newRole: 'admin' | 'professor' | null) => {
        if (!selectedUser) return;

        if (currentUser?.email === selectedUser.email) {
            Alert.alert("Acción denegada", "No puedes modificar tus propios privilegios por cuestiones de seguridad.");
            return;
        }

        setIsUpdating(true);
        try {
            const userRef = doc(db, 'users', selectedUser.id);
            await updateDoc(userRef, { role: newRole });
            // The onSnapshot will automatically update the list
            setModalVisible(false);
            setSelectedUser(null);
        } catch (error) {
            console.error("Error updating role:", error);
            Alert.alert("Error", "No se pudo actualizar el rol del usuario.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteUser = () => {
        if (!selectedUser) return;

        Alert.alert(
            "Dar de Baja",
            `¿Estás seguro de que deseas eliminar a ${selectedUser.email} del sistema? Perderá todo acceso.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        setIsUpdating(true);
                        try {
                            await deleteDoc(doc(db, 'users', selectedUser.id));
                            setModalVisible(false);
                            setSelectedUser(null);
                        } catch (error) {
                            console.error("Error al eliminar usuario:", error);
                            Alert.alert("Error", "No se pudo dar de baja al usuario.");
                        } finally {
                            setIsUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    const openRoleModal = (user: AppUser) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const RoleBadge = ({ role }: { role: AppUser['role'] }) => {
        switch (role) {
            case 'admin':
                return (
                    <View style={[styles.badge, { backgroundColor: '#4f46e5' + '20', borderColor: '#4f46e5' }]}>
                        <ShieldAlert size={14} color="#4f46e5" style={styles.badgeIcon} />
                        <Text style={[styles.badgeText, { color: '#4f46e5' }]}>Administrador</Text>
                    </View>
                );
            case 'professor':
                return (
                    <View style={[styles.badge, { backgroundColor: '#10b981' + '20', borderColor: '#10b981' }]}>
                        <UserIcon size={14} color="#10b981" style={styles.badgeIcon} />
                        <Text style={[styles.badgeText, { color: '#10b981' }]}>Profesor</Text>
                    </View>
                );
            default:
                return (
                    <View style={[styles.badge, { backgroundColor: appColors.border, borderColor: appColors.border }]}>
                        <Clock size={14} color={appColors.textMuted} style={styles.badgeIcon} />
                        <Text style={[styles.badgeText, { color: appColors.textMuted }]}>Sin Asignar</Text>
                    </View>
                );
        }
    };

    const renderUser = ({ item }: { item: AppUser }) => (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: appColors.card, borderColor: appColors.border }]}
            onPress={() => openRoleModal(item)}
            activeOpacity={0.7}
        >
            <View style={styles.userInfo}>
                <View style={[styles.avatarBox, { backgroundColor: appColors.background }]}>
                    <Text style={[styles.avatarText, { color: appColors.text }]}>
                        {item.email.substring(0, 1).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.userDetails}>
                    <Text style={[styles.emailText, { color: appColors.text }]} numberOfLines={1}>
                        {item.email}
                    </Text>
                    <RoleBadge role={item.role} />
                </View>
            </View>
            <ChevronDown size={20} color={appColors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: appColors.background, paddingTop: Math.max(insets.top, 16) }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: appColors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={appColors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: appColors.text }]}>Gestión de Usuarios</Text>
                    <Text style={[styles.headerSubtitle, { color: appColors.textMuted }]}>
                        {users.length} usuarios registrados
                    </Text>
                </View>
            </View>

            {/* List */}
            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.listContent}
                refreshing={isLoading}
                onRefresh={() => { }} // Snapshot handles this, but keeps UI spinner native
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {!isLoading && <Text style={{ color: appColors.textMuted }}>No hay usuarios registrados aún.</Text>}
                    </View>
                )}
            />

            {/* Role Management Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: appColors.card, paddingBottom: insets.bottom + 24 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: appColors.text }]}>Modificar Rol</Text>
                            <Text style={[styles.modalSubtitle, { color: appColors.textMuted }]} numberOfLines={1}>
                                {selectedUser?.email}
                            </Text>
                        </View>

                        <View style={styles.roleOptions}>
                            <TouchableOpacity
                                style={[styles.roleButton, { borderColor: appColors.border, backgroundColor: selectedUser?.role === 'admin' ? '#4f46e5' + '15' : 'transparent', opacity: currentUser?.email === selectedUser?.email ? 0.5 : 1 }]}
                                onPress={() => handleRoleChange('admin')}
                                disabled={isUpdating || currentUser?.email === selectedUser?.email}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <ShieldAlert size={22} color="#4f46e5" />
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: appColors.text }]}>Administrador</Text>
                                        <Text style={[styles.roleDesc, { color: appColors.textMuted }]}>Acceso total al sistema y finanzas.</Text>
                                    </View>
                                </View>
                                {selectedUser?.role === 'admin' && <Check size={20} color="#4f46e5" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.roleButton, { borderColor: appColors.border, backgroundColor: selectedUser?.role === 'professor' ? '#10b981' + '15' : 'transparent', opacity: currentUser?.email === selectedUser?.email ? 0.5 : 1 }]}
                                onPress={() => handleRoleChange('professor')}
                                disabled={isUpdating || currentUser?.email === selectedUser?.email}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <UserIcon size={22} color="#10b981" />
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: appColors.text }]}>Profesor</Text>
                                        <Text style={[styles.roleDesc, { color: appColors.textMuted }]}>Solo puede ver clases, estudiantes y asistencia.</Text>
                                    </View>
                                </View>
                                {selectedUser?.role === 'professor' && <Check size={20} color="#10b981" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.roleButton, { borderColor: appColors.border, backgroundColor: selectedUser?.role === null ? appColors.border : 'transparent', opacity: currentUser?.email === selectedUser?.email ? 0.5 : 1 }]}
                                onPress={() => handleRoleChange(null)}
                                disabled={isUpdating || currentUser?.email === selectedUser?.email}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <ShieldCheck size={22} color={appColors.textMuted} />
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: appColors.text }]}>Sin Privilegios</Text>
                                        <Text style={[styles.roleDesc, { color: appColors.textMuted }]}>Usuario sin permisos. No podrá entrar al Dashboard.</Text>
                                    </View>
                                </View>
                                {selectedUser?.role === null && <Check size={20} color={appColors.textMuted} />}
                            </TouchableOpacity>

                            {/* Self-delete protection: only show if the selected user is NOT the currently logged-in user */}
                            {currentUser?.email !== selectedUser?.email && (
                                <TouchableOpacity
                                    style={[styles.roleButton, { borderColor: '#ef4444' + '40', backgroundColor: '#ef4444' + '10', marginTop: 12 }]}
                                    onPress={handleDeleteUser}
                                    disabled={isUpdating}
                                >
                                    <View style={styles.roleButtonLeft}>
                                        <Trash2 size={22} color="#ef4444" />
                                        <View style={styles.roleButtonTextContainer}>
                                            <Text style={[styles.roleName, { color: '#ef4444' }]}>Dar de Baja</Text>
                                            <Text style={[styles.roleDesc, { color: appColors.textMuted }]}>Elimina a este usuario del sistema permanentemente.</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: appColors.background }]}
                            onPress={() => setModalVisible(false)}
                            disabled={isUpdating}
                        >
                            <Text style={[styles.closeButtonText, { color: appColors.text }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    listContent: {
        padding: 16,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
            }
        })
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    userDetails: {
        flex: 1,
    },
    emailText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeIcon: {
        marginRight: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 24,
            },
            web: {
                boxShadow: '0px -4px 12px rgba(0,0,0,0.1)',
            }
        })
    },
    modalHeader: {
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 16,
    },
    roleOptions: {
        gap: 12,
        marginBottom: 24,
    },
    roleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    roleButtonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    roleButtonTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    roleName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    roleDesc: {
        fontSize: 13,
    },
    closeButton: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
