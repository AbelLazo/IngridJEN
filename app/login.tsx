import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { auth, db } from '../lib/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    // Set up Expo Google Auth Session
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: '794528666075-n2268ldbqu0ju16n6n165a9hj1858cpe.apps.googleusercontent.com',
        webClientId: '794528666075-n2268ldbqu0ju16n6n165a9hj1858cpe.apps.googleusercontent.com',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token, access_token } = response.params;

            try {
                if (!id_token && !access_token) {
                    throw new Error("No token received from Google");
                }

                // If we get an id_token, pass it as the first param.
                // If we only get an access_token, pass null for the first param and the access_token for the second.
                const credential = id_token
                    ? GoogleAuthProvider.credential(id_token)
                    : GoogleAuthProvider.credential(null, access_token);

                signInWithCredential(auth, credential)
                    .catch(error => {
                        console.error("Firebase signInWithCredential Error:", error);
                        Alert.alert('Error', 'No se pudo iniciar sesión en Firebase con Google.');
                    });
            } catch (error) {
                console.error("Credential Creation Error:", error);
            }
        }
    }, [response]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor, ingresa tu correo y contraseña.');
            return;
        }

        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Let the _layout.tsx effect handle the redirect
        } catch (error: any) {
            console.error('Login error:', error);
            let errorMessage = 'Error al iniciar sesión. Inténtalo de nuevo.';
            if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Credenciales incorrectas.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Formato de correo inválido.';
            }
            Alert.alert('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRootAdmin = async () => {
        // Hidden functionality to create the first admin for testing.
        // In production, users will be created via a dedicated dashboard.
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, 'abelazo16052001@gmail.com', 'PUDGEward16//*//*');
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: userCredential.user.email,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            Alert.alert('Éxito', 'Administrador raíz creado e iniciada sesión.');
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                // If already exists, just login
                await signInWithEmailAndPassword(auth, 'abelazo16052001@gmail.com', 'PUDGEward16//*//*');
            } else {
                console.error('Error creating admin:', error);
                Alert.alert('Error', 'No se pudo crear el admin raíz.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const colors = {
        background: isDark ? '#111827' : '#F3F4F6',
        card: isDark ? '#1F2937' : '#FFFFFF',
        text: isDark ? '#F9FAFB' : '#111827',
        textMuted: isDark ? '#9CA3AF' : '#6B7280',
        primary: '#3B82F6',
        border: isDark ? '#374151' : '#E5E7EB',
        inputBg: isDark ? '#374151' : '#F9FAFB',
    };

    return (
        <KeyboardAvoidingView
            style={[{ flex: 1, backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.container}>

                    <View style={styles.header}>
                        <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
                            <Text style={styles.logoText}>IJ</Text>
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>IngridJEN</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            Sistema de Gestión Académica
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Correo Electrónico</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Mail color={colors.textMuted} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="admin@ingridjen.edu"
                                    placeholderTextColor={colors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Lock color={colors.textMuted} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Iniciar Sesión</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                            <Text style={[styles.dividerText, { color: colors.textMuted }]}>O</Text>
                            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        </View>

                        <TouchableOpacity
                            style={[styles.googleButton, { borderColor: colors.border }]}
                            onPress={() => promptAsync()}
                            disabled={!request}
                        >
                            <Text style={[styles.googleButtonText, { color: colors.text }]}>Continuar con Google</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
    },
    button: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    googleButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
