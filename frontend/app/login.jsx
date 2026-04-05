import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async () => {
        setErrorMessage('');
        try {
            if (!email || !password) {
                setErrorMessage('Please fill in both fields.');
                return;
            }
            const payload = email.includes('@') ? { email, password } : { phone: email, password };
            const res = await api.post('/auth/login', payload);
            await AsyncStorage.setItem('token', res.data.token);
            await AsyncStorage.setItem('role', res.data.role);
            router.replace('/(tabs)');
        } catch (err) {
            setErrorMessage(err.response?.data?.msg || 'Invalid credentials or server error.');
            console.error('Login Error:', err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to find blue collar jobs</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Email or Phone Number"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>LOGIN</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.linkText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 32
    },
    inputContainer: {
        marginBottom: 24
    },
    input: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#dee2e6'
    },
    button: {
        backgroundColor: '#28a745',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#28a745',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1
    },
    linkText: {
        color: '#28a745',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600'
    },
    errorText: {
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: 'bold'
    }
});
