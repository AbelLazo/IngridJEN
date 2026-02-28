import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { auth, db, firebaseConfig } from '@/lib/firebaseConfig';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore';
import { AlertCircle, Check, ChevronDown, ChevronLeft, Clock, Eye, EyeOff, Mail, Plus, ShieldAlert, ShieldCheck, User as UserIcon, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../hooks/use-color-scheme';

interface AppUser {
    id: string;
    email: string;
    role: 'admin' | 'professor' | null;
    createdAt?: string;
}

export default function UsersScreen() {
    const { userRole } = useAuth();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { width } = useWindowDimensions();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const insets = useSafeAreaInsets();

    if (userRole !== 'admin') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
                <AlertCircle size={48} color={colors.secondary} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso Denegado</Text>
                <Text style={{ color: colors.icon, marginTop: 8 }}>Solo los administradores pueden gestionar usuarios.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 12 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // States for adding a new user
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [newUserRole, setNewUserRole] = useState<'admin' | 'professor' | null>(null);
    const [addModalError, setAddModalError] = useState<string | null>(null);

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

    const handlePasswordReset = async () => {
        if (!selectedUser) return;

        setIsUpdating(true);
        try {
            await sendPasswordResetEmail(auth, selectedUser.email);
            Alert.alert("Éxito", `Se ha enviado un correo de restablecimiento a ${selectedUser.email}`);
        } catch (error: any) {
            console.error("Error sending password reset:", error);
            Alert.alert("Error", "No se pudo enviar el correo de restablecimiento.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddUser = async () => {
        setAddModalError(null);
        if (!newUserEmail.trim() || !newUserPassword.trim()) {
            setAddModalError("El correo y la contraseña son obligatorios.");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUserEmail.trim())) {
            setAddModalError("Ingresa un correo electrónico válido.");
            return;
        }

        setIsUpdating(true);
        try {
            // Check if user already exists in local list (firestore listener might take a sec)
            if (users.some(u => u.email.toLowerCase() === newUserEmail.trim().toLowerCase())) {
                setAddModalError("Ya existe un usuario con este correo electrónico.");
                setIsUpdating(false);
                return;
            }

            // Create secondary Firebase app instance to avoid signing out the current user
            const apps = getApps();
            const secondaryApp = apps.find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
            const secondaryAuth = getAuth(secondaryApp);

            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail.trim().toLowerCase(), newUserPassword);
            const newUid = userCredential.user.uid;

            // Immediately sign out from secondary app to avoid session conflicts
            await signOut(secondaryAuth);

            // Create explicitly a predefined user document
            const newDocRef = doc(collection(db, 'users'), newUid);
            await setDoc(newDocRef, {
                email: newUserEmail.trim().toLowerCase(),
                role: newUserRole,
                createdAt: new Date().toISOString()
            });

            setAddModalVisible(false);
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole(null);
            // Only one success alert is enough
            Alert.alert("Éxito", "Usuario registrado correctamente.");
        } catch (error: any) {
            console.error("Error al agregar usuario:", error);

            if (error.code === 'auth/email-already-in-use') {
                setAddModalError("Este correo ya está registrado en la plataforma.");
            } else if (error.code === 'auth/weak-password') {
                setAddModalError("La contraseña es muy débil (mínimo 6 caracteres).");
            } else {
                setAddModalError("Error: " + (error.message || "No se pudo registrar al usuario."));
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const openRoleModal = (user: AppUser) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const RoleBadge = ({ role }: { role: AppUser['role'] }) => {
        switch (role) {
            case 'admin':
                return (
                    <View style={[styles.badge, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]}>
                        <ShieldAlert size={14} color={colors.secondary} style={styles.badgeIcon} />
                        <Text style={[styles.badgeText, { color: colors.secondary }]}>Administrador</Text>
                    </View>
                );
            case 'professor':
                return (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                        <UserIcon size={14} color={colors.primary} style={styles.badgeIcon} />
                        <Text style={[styles.badgeText, { color: colors.primary }]}>Profesor</Text>
                    </View>
                );
            default:
                return (
                    <View style={[styles.badge, { backgroundColor: colors.border, borderColor: colors.border }]}>
                        <Clock size={14} color={colors.icon} style={styles.badgeIcon} />
                        <Text style={[styles.badgeText, { color: colors.icon }]}>Sin Asignar</Text>
                    </View>
                );
        }
    };

    const renderUser = ({ item }: { item: AppUser }) => (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                onPress={() => openRoleModal(item)}
                activeOpacity={0.7}
            >
                <BlurView
                    intensity={90}
                    tint={colorScheme === 'light' ? 'light' : 'dark'}
                    style={[
                        styles.userCard,
                        {
                            backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
                            borderColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                        }
                    ]}
                >

                    <View style={styles.userInfo}>
                        <View style={[styles.avatarBox, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>
                                {item.email.substring(0, 1).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={[styles.emailText, { color: colors.text }]} numberOfLines={1}>
                                {item.email}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <RoleBadge role={item.role} />
                            </View>
                        </View>
                    </View>
                    <ChevronDown size={20} color={colors.icon} />
                </BlurView>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Gestión de Usuarios</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        setNewUserEmail('');
                        setNewUserPassword('');
                        setNewUserRole(null);
                        setAddModalVisible(true);
                    }}
                    activeOpacity={0.8}
                >
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
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
                        {!isLoading && <Text style={{ color: colors.icon }}>No hay usuarios registrados aún.</Text>}
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
                    <View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: colors.modal,
                                borderColor: colors.border,
                                paddingBottom: Math.max(insets.bottom, 24),
                                width: '100%',
                                maxWidth: 500,
                                alignSelf: 'center',
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                            }
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Modificar Rol</Text>
                                <Text style={[styles.modalSubtitle, { color: colors.icon }]} numberOfLines={1}>
                                    {selectedUser?.email}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.roleOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    selectedUser?.role === 'admin' ? {
                                        backgroundColor: colors.secondary,
                                        shadowColor: colors.secondary,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8,
                                        elevation: Platform.OS === 'android' ? 0 : 4,
                                        borderColor: 'transparent'
                                    } : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.45)',
                                        borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)',
                                    },
                                    currentUser?.email === selectedUser?.email && { opacity: 0.5 }
                                ]}
                                onPress={() => handleRoleChange('admin')}
                                disabled={isUpdating || currentUser?.email === selectedUser?.email}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <View style={[
                                        styles.iconBg,
                                        { backgroundColor: selectedUser?.role === 'admin' ? 'rgba(255,255,255,0.2)' : colors.border + '40' }
                                    ]}>
                                        <ShieldAlert size={20} color={selectedUser?.role === 'admin' ? '#fff' : colors.text} />
                                    </View>
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: selectedUser?.role === 'admin' ? '#fff' : colors.text }]}>Administrador</Text>
                                        <Text style={[styles.roleDesc, { color: selectedUser?.role === 'admin' ? 'rgba(255,255,255,0.8)' : colors.icon }]}>Acceso total al sistema y finanzas.</Text>
                                    </View>
                                </View>
                                {selectedUser?.role === 'admin' ? (
                                    <Check size={20} color="#fff" />
                                ) : (
                                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    selectedUser?.role === 'professor' ? {
                                        backgroundColor: colors.primary,
                                        shadowColor: colors.primary,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8,
                                        elevation: Platform.OS === 'android' ? 0 : 4,
                                        borderColor: 'transparent'
                                    } : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.45)',
                                        borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)',
                                    },
                                    currentUser?.email === selectedUser?.email && { opacity: 0.5 }
                                ]}
                                onPress={() => handleRoleChange('professor')}
                                disabled={isUpdating || currentUser?.email === selectedUser?.email}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <View style={[
                                        styles.iconBg,
                                        { backgroundColor: selectedUser?.role === 'professor' ? 'rgba(255,255,255,0.2)' : colors.border + '40' }
                                    ]}>
                                        <UserIcon size={20} color={selectedUser?.role === 'professor' ? '#fff' : colors.text} />
                                    </View>
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: selectedUser?.role === 'professor' ? '#fff' : colors.text }]}>Profesor</Text>
                                        <Text style={[styles.roleDesc, { color: selectedUser?.role === 'professor' ? 'rgba(255,255,255,0.8)' : colors.icon }]}>Solo puede ver clases, estudiantes y asistencia.</Text>
                                    </View>
                                </View>
                                {selectedUser?.role === 'professor' ? (
                                    <Check size={20} color="#fff" />
                                ) : (
                                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    selectedUser?.role === null ? {
                                        backgroundColor: '#ef4444',
                                        shadowColor: '#ef4444',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8,
                                        elevation: Platform.OS === 'android' ? 0 : 4,
                                        borderColor: 'transparent'
                                    } : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.45)',
                                        borderColor: colorScheme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)',
                                    },
                                    currentUser?.email === selectedUser?.email && { opacity: 0.5 }
                                ]}
                                onPress={() => handleRoleChange(null)}
                                disabled={isUpdating || currentUser?.email === selectedUser?.email}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <View style={[
                                        styles.iconBg,
                                        { backgroundColor: selectedUser?.role === null ? 'rgba(255,255,255,0.2)' : colors.border + '40' }
                                    ]}>
                                        <ShieldCheck size={20} color={selectedUser?.role === null ? '#fff' : colors.text} />
                                    </View>
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: selectedUser?.role === null ? '#fff' : colors.text }]}>Sin Privilegios</Text>
                                        <Text style={[styles.roleDesc, { color: selectedUser?.role === null ? 'rgba(255,255,255,0.8)' : colors.icon }]}>Usuario sin permisos. No podrá entrar al Dashboard.</Text>
                                    </View>
                                </View>
                                {selectedUser?.role === null ? (
                                    <Check size={20} color="#fff" />
                                ) : (
                                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
                            <TouchableOpacity
                                style={[
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 16,
                                        borderRadius: 12,
                                        backgroundColor: colors.secondary,
                                        shadowColor: colors.secondary,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8,
                                        elevation: Platform.OS === 'android' ? 0 : 4,
                                    }
                                ]}
                                onPress={handlePasswordReset}
                                disabled={isUpdating}
                            >
                                <Mail size={20} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 10 }}>Enviar Correo de Restablecimiento</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add User Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={addModalVisible}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: colors.modal,
                                borderColor: colors.border,
                                paddingBottom: Math.max(insets.bottom, 24),
                                width: '100%',
                                maxWidth: 500,
                                alignSelf: 'center',
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                            }
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Usuario</Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.closeButton}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {addModalError && (
                            <View style={[styles.errorContainer, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}>
                                <Text style={[styles.errorText, { color: '#ef4444' }]}>{addModalError}</Text>
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Correo Electrónico</Text>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    {
                                        backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
                                        borderColor: colors.border,
                                        color: colors.text
                                    }
                                ]}
                                placeholder="ejemplo@correo.com"
                                placeholderTextColor={colors.icon}
                                value={newUserEmail}
                                onChangeText={setNewUserEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Contraseña</Text>
                            <View style={[
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderRadius: 12,
                                    paddingRight: 8,
                                    backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
                                    borderColor: colors.border,
                                }
                            ]}>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        {
                                            flex: 1,
                                            borderWidth: 0,
                                            backgroundColor: 'transparent',
                                            color: colors.text,
                                            height: 48,
                                            paddingHorizontal: 12,
                                        }
                                    ]}
                                    placeholder="Contraseña segura"
                                    placeholderTextColor={colors.icon}
                                    value={newUserPassword}
                                    onChangeText={setNewUserPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                                    {showPassword ? (
                                        <EyeOff size={20} color={colors.icon} />
                                    ) : (
                                        <Eye size={20} color={colors.icon} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 12 }]}>Seleccionar Rol</Text>
                        <View style={styles.roleOptions}>
                            {/* Option: Admin */}
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    newUserRole === 'admin' ? {
                                        backgroundColor: colors.secondary,
                                        borderColor: colors.secondary,
                                        shadowColor: colors.secondary,
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.4,
                                        shadowRadius: 16,
                                        elevation: Platform.OS === 'android' ? 0 : 8,
                                    } : {
                                        backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
                                        borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'
                                    }
                                ]}
                                onPress={() => setNewUserRole('admin')}
                                disabled={isUpdating}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <View style={[styles.iconBg, { backgroundColor: newUserRole === 'admin' ? 'rgba(255,255,255,0.2)' : colors.border + '40' }]}>
                                        <ShieldAlert size={20} color={newUserRole === 'admin' ? '#fff' : colors.text} />
                                    </View>
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: newUserRole === 'admin' ? '#fff' : colors.text }]}>Administrador</Text>
                                        <Text style={[styles.roleDesc, { color: newUserRole === 'admin' ? 'rgba(255,255,255,0.8)' : colors.icon }]}>Acceso total al sistema y ajustes.</Text>
                                    </View>
                                </View>
                                {newUserRole === 'admin' ? (
                                    <Check size={20} color="#fff" />
                                ) : (
                                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                                )}
                            </TouchableOpacity>

                            {/* Option: Professor */}
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    newUserRole === 'professor' ? {
                                        backgroundColor: colors.primary,
                                        borderColor: colors.primary,
                                        shadowColor: colors.primary,
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.4,
                                        shadowRadius: 16,
                                        elevation: Platform.OS === 'android' ? 0 : 8,
                                    } : {
                                        backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
                                        borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'
                                    }
                                ]}
                                onPress={() => setNewUserRole('professor')}
                                disabled={isUpdating}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <View style={[styles.iconBg, { backgroundColor: newUserRole === 'professor' ? 'rgba(255,255,255,0.2)' : colors.border + '40' }]}>
                                        <UserIcon size={20} color={newUserRole === 'professor' ? '#fff' : colors.text} />
                                    </View>
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: newUserRole === 'professor' ? '#fff' : colors.text }]}>Profesor</Text>
                                        <Text style={[styles.roleDesc, { color: newUserRole === 'professor' ? 'rgba(255,255,255,0.8)' : colors.icon }]}>Asistencia, calificaciones, materiales.</Text>
                                    </View>
                                </View>
                                {newUserRole === 'professor' ? (
                                    <Check size={20} color="#fff" />
                                ) : (
                                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                                )}
                            </TouchableOpacity>

                            {/* Option: None */}
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    newUserRole === null ? {
                                        backgroundColor: colors.border + '80',
                                        borderColor: colors.border,
                                    } : {
                                        backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
                                        borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'
                                    }
                                ]}
                                onPress={() => setNewUserRole(null)}
                                disabled={isUpdating}
                            >
                                <View style={styles.roleButtonLeft}>
                                    <View style={[styles.iconBg, { backgroundColor: newUserRole === null ? 'rgba(255,255,255,0.2)' : colors.border + '40' }]}>
                                        <Clock size={20} color={newUserRole === null ? '#fff' : colors.text} />
                                    </View>
                                    <View style={styles.roleButtonTextContainer}>
                                        <Text style={[styles.roleName, { color: newUserRole === null ? '#fff' : colors.text }]}>Sin Privilegios</Text>
                                        <Text style={[styles.roleDesc, { color: newUserRole === null ? 'rgba(255,255,255,0.8)' : colors.icon }]}>Usuario registrado sin accesos.</Text>
                                    </View>
                                </View>
                                {newUserRole === null ? (
                                    <Check size={20} color="#fff" />
                                ) : (
                                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                { backgroundColor: colors.primary, opacity: isUpdating || !newUserEmail.trim() || !newUserPassword.trim() ? 0.6 : 1 }
                            ]}
                            onPress={handleAddUser}
                            disabled={isUpdating || !newUserEmail.trim() || !newUserPassword.trim()}
                        >
                            <Text style={styles.primaryButtonText}>Pre-registrar Usuario</Text>
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: Platform.OS === 'android' ? 0 : 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    listContent: {
        padding: 16,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    cardContainer: {
        marginBottom: 12,
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 0 : 6,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderRadius: 32,
        borderWidth: 1,
    },
    liquidHighlightModal: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
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
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        maxWidth: 600,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        padding: 24,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: Platform.OS === 'android' ? 0 : 24,
            },
            web: {
                boxShadow: '0px -4px 12px rgba(0,0,0,0.1)',
            }
        })
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
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
    roleButtonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    roleButtonTextContainer: {
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
        padding: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(150, 150, 150, 0.1)',
    },
    fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        elevation: Platform.OS === 'android' ? 0 : 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
    },
    primaryButton: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmDeleteContainer: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 8,
    },
    confirmDeleteText: {
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 20,
    },
    confirmDeleteActions: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmButton: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    cancelDeleteButton: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelDeleteButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
    },
});
