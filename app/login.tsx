import { FontAwesome } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
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
        androidClientId: '794528666075-nbrcoq95g122dkq78eo5i4e6bud8gckt.apps.googleusercontent.com',
        scopes: ['profile', 'email', 'openid'],
    });

    const url = Linking.useURL();

    // Fallback: manually parse URL if expo-auth-session loses its internal state during redirect
    useEffect(() => {
        if (url && (url.includes('id_token=') || url.includes('access_token=') || url.includes('code='))) {
            try {
                const idTokenMatch = url.match(/id_token=([^&]+)/);
                const accessTokenMatch = url.match(/access_token=([^&]+)/);
                const codeMatch = url.match(/code=([^&]+)/);

                const id_token = idTokenMatch ? idTokenMatch[1] : null;
                const access_token = accessTokenMatch ? accessTokenMatch[1] : null;

                if (id_token || access_token) {
                    setIsLoading(true);
                    const credential = id_token
                        ? GoogleAuthProvider.credential(id_token)
                        : GoogleAuthProvider.credential(null, access_token!);

                    signInWithCredential(auth, credential)
                        .then(() => setIsLoading(false))
                        .catch(error => {
                            console.error("Firebase signInWithCredential Error from DeepLink:", error);
                            Alert.alert('Error', 'No se pudo iniciar sesión con Google. ' + error.message);
                            setIsLoading(false);
                        });
                } else if (codeMatch && !idTokenMatch) {
                    const code = codeMatch[1];
                    setIsLoading(true);
                    const redirectUri = request?.redirectUri || Linking.createURL('/oauthredirect');
                    AuthSession.exchangeCodeAsync(
                        {
                            clientId: request?.clientId || '794528666075-nbrcoq95g122dkq78eo5i4e6bud8gckt.apps.googleusercontent.com',
                            code,
                            redirectUri,
                            extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
                        },
                        { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
                    ).then(tokenResult => {
                        const credential = tokenResult.idToken
                            ? GoogleAuthProvider.credential(tokenResult.idToken)
                            : GoogleAuthProvider.credential(null, tokenResult.accessToken);
                        return signInWithCredential(auth, credential);
                    }).then(() => {
                        setIsLoading(false);
                    }).catch(error => {
                        console.error("Manual Token Exchange Error:", error);
                        Alert.alert('Error', 'No se pudo iniciar sesión con Google (exchange). ' + error.message);
                        setIsLoading(false);
                    });
                }
            } catch (e) {
                console.error("Manual Deep Link parsing failed", e);
                setIsLoading(false);
            }
        }
    }, [url]);

    useEffect(() => {
        if (!response) return;

        if (response.type === 'success') {
            const id_token = response.params?.id_token || response.authentication?.idToken;
            const access_token = response.params?.access_token || response.authentication?.accessToken;
            const code = response.params?.code;

            try {
                if (id_token || access_token) {
                    setIsLoading(true);
                    // If we get an id_token, pass it as the first param.
                    // If we only get an access_token, pass null for the first param and the access_token for the second.
                    const credential = id_token
                        ? GoogleAuthProvider.credential(id_token)
                        : GoogleAuthProvider.credential(null, access_token!);

                    signInWithCredential(auth, credential)
                        .then(() => setIsLoading(false))
                        .catch(error => {
                            console.error("Firebase signInWithCredential Error:", error);
                            Alert.alert('Error', 'No se pudo iniciar sesión en Firebase con Google. ' + error.message);
                            setIsLoading(false);
                        });
                } else if (code) {
                    setIsLoading(true);
                    const redirectUri = request?.redirectUri || response.url || Linking.createURL('/oauthredirect');
                    AuthSession.exchangeCodeAsync(
                        {
                            clientId: request?.clientId || '794528666075-nbrcoq95g122dkq78eo5i4e6bud8gckt.apps.googleusercontent.com',
                            code,
                            redirectUri,
                            extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
                        },
                        { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
                    ).then(tokenResult => {
                        const credential = tokenResult.idToken
                            ? GoogleAuthProvider.credential(tokenResult.idToken)
                            : GoogleAuthProvider.credential(null, tokenResult.accessToken);
                        return signInWithCredential(auth, credential);
                    }).then(() => {
                        setIsLoading(false);
                    }).catch(err => {
                        console.error("Token Exchange Error:", err);
                        Alert.alert('Error', 'No se pudo intercambiar el código por un token. ' + err.message);
                        setIsLoading(false);
                    });
                } else {
                    Alert.alert("Error de Token", "La autenticación fue exitosa pero Google no devolvió un Id Token válido.\nParams: " + JSON.stringify(response.params));
                    setIsLoading(false);
                }
            } catch (error: any) {
                console.error("Credential Creation Error:", error);
                Alert.alert('Error', error.message || 'Error occurred');
                setIsLoading(false);
            }
        } else if (response.type !== 'dismiss' && response.type !== 'cancel') {
            // Handle 'error' or any other types
            const errorMessage = response.type === 'error' && response.error
                ? response.error.message
                : (response as any).params?.error || 'Unknown error';
            Alert.alert("Autenticación Fallida", `Tipo: ${response.type}\nDetalle: ${errorMessage}`);
            setIsLoading(false);
        } else {
            // Dismissed or canceled
            setIsLoading(false);
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

    const handleResetPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Correo Requerido', 'Por favor, ingresa tu correo electrónico para enviarte las instrucciones de recuperación.');
            return;
        }

        try {
            setIsLoading(true);
            await sendPasswordResetEmail(auth, email.trim().toLowerCase());
            Alert.alert('Éxito', 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.');
        } catch (error: any) {
            console.error('Password reset error detail:', error);
            let errorMessage = 'No se pudo enviar el correo de recuperación. Inténtalo más tarde.';
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'El formato del correo electrónico no es válido.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No hay ningún usuario registrado con este correo.';
            }
            Alert.alert('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForceUpdate = async () => {
        setIsLoading(true);
        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                await Updates.fetchUpdateAsync();
                Alert.alert("Éxito", "Actualización instalada. Reiniciando...");
                await Updates.reloadAsync();
            } else {
                Alert.alert("Actualizado", "Ya tienes la versión más reciente.");
            }
        } catch (error) {
            Alert.alert("Error de Envío", "No se pudo consultar al servidor de actualizaciones.");
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
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.05)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.1)',
                                    overflow: 'hidden'
                                }
                            ]}
                        >


                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: colors.text }]}>Correo Electrónico</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.03)', borderColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
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
                                <View style={[styles.inputWrapper, { backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.03)', borderColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
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
                                <TouchableOpacity onPress={handleResetPassword} style={{ marginTop: 10, alignSelf: 'flex-end', marginRight: 4 }}>
                                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>¿Olvidaste tu contraseña?</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: isLoading ? 0.7 : 1,
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

                            <TouchableOpacity onPress={handleForceUpdate} style={{ marginTop: 20, alignSelf: 'center' }}>
                                <Text style={{ color: colors.text, opacity: 0.5, fontSize: 13, textDecorationLine: 'underline' }}>Forzar Actualización de la Nube</Text>
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
        elevation: Platform.OS === 'android' ? 0 : 8,
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
        elevation: Platform.OS === 'android' ? 0 : 6,
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
