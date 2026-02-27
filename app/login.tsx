import { FontAwesome } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { auth, db } from '../lib/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';
    const passwordInputRef = useRef<TextInput>(null);

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
        setIsLoading(true);
        const cleanEmail = email.trim().toLowerCase();
        console.log("LOGIN_DEBUG: Attempting login for email:", cleanEmail);
        console.log("LOGIN_DEBUG: Password length:", password.length);

        try {
            await signInWithEmailAndPassword(auth, cleanEmail, password);
            console.log("LOGIN_DEBUG: Auth success, waiting for _layout redirection");
            // Redirection is handled by _layout.tsx based on AuthContext state
        } catch (error: any) {
            console.error('Login error detail:', {
                code: error.code,
                message: error.message,
                email: cleanEmail
            });
            let errorMessage = 'Error al iniciar sesión. Inténtalo de nuevo.';
            if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Credenciales incorrectas. Verifica que el correo y la contraseña no tengan espacios adicionales y que las mayúsculas sean correctas.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El formato del correo electrónico no es válido.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'Esta cuenta ha sido deshabilitada por el administrador.';
            }
            Alert.alert('Error de Autenticación', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRootAdmin = async () => {
        // Hidden functionality to create the first admin for testing.
        // In production, users will be created via a dedicated dashboard.
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, 'abelazo6969@gmail.com', 'PUDGEward16//*//*');
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: userCredential.user.email,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            Alert.alert('Éxito', 'Administrador raíz creado e iniciada sesión.');
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                // If already exists, just login
                await signInWithEmailAndPassword(auth, 'abelazo6969@gmail.com', 'PUDGEward16//*//*');
            } else {
                console.error('Error creating admin:', error);
                Alert.alert('Error', 'No se pudo crear el admin raíz.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    return (
        <View style={[styles.backgroundImage, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.container}>

                        <View style={styles.header}>
                            <TouchableOpacity activeOpacity={1} onPress={handleCreateRootAdmin}>
                                <Image
                                    source={require('../assets/images/ballet_logo.png')}
                                    style={styles.mainLogo}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>

                        <BlurView
                            intensity={90}
                            tint={colorScheme === 'light' ? 'light' : 'dark'}
                            style={[
                                styles.card,
                                {
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.08)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.15)'
                                }
                            ]}
                        >
                            <View style={[styles.liquidHighlight, { height: '50%', opacity: 0.8 }]} />

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: colors.text }]}>Correo Electrónico</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }]}>
                                    <Mail color={colors.text} size={20} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="admin@ingridjen.edu"
                                        placeholderTextColor={colors.text + '60'}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="next"
                                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                                        blurOnSubmit={false}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }]}>
                                    <Lock color={colors.text} size={20} style={styles.inputIcon} />
                                    <TextInput
                                        ref={passwordInputRef}
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.text + '60'}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        returnKeyType="go"
                                        onSubmitEditing={handleLogin}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                                        {showPassword ? <EyeOff size={20} color={colors.text + '80'} /> : <Eye size={20} color={colors.text + '80'} />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: isLoading ? 0.7 : 1,
                                        shadowColor: colors.primary,
                                    }
                                ]}
                                onPress={handleLogin}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={colorScheme === 'dark' ? '#2D2621' : '#FFFFFF'} />
                                ) : (
                                    <Text style={[styles.buttonText, { color: colorScheme === 'dark' ? '#2D2621' : '#FFFFFF' }]}>Entrar al Estudio</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={[styles.dividerLine, { backgroundColor: colors.text, opacity: 0.1 }]} />
                                <Text style={[styles.dividerText, { color: colors.text, opacity: 0.6 }]}>O</Text>
                                <View style={[styles.dividerLine, { backgroundColor: colors.text, opacity: 0.1 }]} />
                            </View>

                            <TouchableOpacity
                                style={[styles.googleButton, { borderColor: colors.text + '20', backgroundColor: 'transparent' }]}
                                onPress={() => promptAsync()}
                                disabled={!request}
                            >
                                <View style={styles.googleButtonContent}>
                                    <FontAwesome name="google" size={20} color={colors.text} style={styles.googleIcon} />
                                    <Text style={[styles.googleButtonText, { color: colors.text }]}>Acceder con Google</Text>
                                </View>
                            </TouchableOpacity>
                        </BlurView>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
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
        marginBottom: 36,
        marginTop: 40,
    },
    mainLogo: {
        width: 280,
        height: 120,
    },
    card: {
        borderRadius: 32,
        padding: 28,
        borderWidth: 1.5,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    liquidHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        zIndex: 0,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 58,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 54,
        fontSize: 16,
    },
    button: {
        height: 58,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
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
        fontWeight: '600',
    },
    googleButton: {
        height: 58,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    googleButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    googleIcon: {
        opacity: 0.9,
    }
});
