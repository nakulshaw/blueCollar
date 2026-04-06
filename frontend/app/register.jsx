import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

export default function Register() {
    const router = useRouter();
    const [role, setRole] = useState('worker');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleRegister = async () => {
        setErrorMessage('');
        try {
            if (!name || !password || (!email && !phone)) {
                setErrorMessage('Please fill required fields.');
                return;
            }

            const payload = { role, name, password };
            if (email) payload.email = email;
            if (phone) payload.phone = phone;

            const res = await api.post('/auth/register', payload);
            await AsyncStorage.setItem('token', res.data.token);
            await AsyncStorage.setItem('role', res.data.role);
            await AsyncStorage.setItem('userName', res.data.name || '');
            await AsyncStorage.setItem('userEmail', res.data.email || '');
            await AsyncStorage.setItem('userPhone', res.data.phone || '');
            await AsyncStorage.setItem('aadharStatus', res.data.aadharStatus || 'pending');
            router.replace('/(tabs)');
        } catch (err) {
            setErrorMessage(err.response?.data?.msg || 'An error occurred during registration.');
            console.error('Registration Error:', err);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join as a Worker or Employer</Text>

            <View style={styles.inputContainer}>
                {/* Basic selector using simple buttons for UI sleakness compared to pickers */}
                <View style={styles.roleContainer}>
                    <TouchableOpacity
                        style={[styles.roleButton, role === 'worker' && styles.roleButtonActive]}
                        onPress={() => setRole('worker')}>
                        <Text style={[styles.roleText, role === 'worker' && styles.roleTextActive]}>Worker</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleButton, role === 'employer' && styles.roleButtonActive]}
                        onPress={() => setRole('employer')}>
                        <Text style={[styles.roleText, role === 'employer' && styles.roleTextActive]}>Employer</Text>
                    </TouchableOpacity>
                </View>

                <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#1c1c1cff" value={name} onChangeText={setName} />
                <TextInput style={styles.input} placeholder="Email (Optional)" placeholderTextColor="#1c1c1cff" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
                <TextInput style={styles.input} placeholder="Phone Number (Optional)" placeholderTextColor="#1c1c1cff" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#1c1c1cff" secureTextEntry value={password} onChangeText={setPassword} />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>SIGN UP</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.linkText}>Already have an account? Log in</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
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
    roleContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'space-between'
    },
    roleButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
        marginHorizontal: 5,
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    roleButtonActive: {
        backgroundColor: '#e8f4fd',
        borderColor: '#007bff'
    },
    roleText: {
        color: '#6c757d',
        fontWeight: '600'
    },
    roleTextActive: {
        color: '#007bff'
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
        backgroundColor: '#007bff',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#007bff',
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
        color: '#007bff',
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
