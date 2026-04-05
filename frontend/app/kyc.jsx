import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../utils/api';

export default function KYC() {
    const router = useRouter();
    const [aadhar, setAadhar] = useState('');

    const handleVerify = async () => {
        try {
            if (aadhar.length !== 12) {
                return Alert.alert('Error', 'Aadhar number must be 12 digits');
            }

            const res = await api.post('/kyc/verify', { aadharNumber: aadhar });
            Alert.alert('Success', res.data.msg);
            router.back();
        } catch (err) {
            Alert.alert('Verification Failed', err.response?.data?.msg || 'Error calling KYC API');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Identity Verification</Text>
            <Text style={styles.subtitle}>Enter your Aadhar Number to verify your account</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="12-digit Aadhar Number"
                    keyboardType="numeric"
                    maxLength={12}
                    value={aadhar}
                    onChangeText={setAadhar}
                />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleVerify}>
                <Text style={styles.buttonText}>VERIFY</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.skipButton}>
                <Text style={styles.linkText}>Skip for now</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f8f9fa' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#343a40', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#6c757d', marginBottom: 32 },
    inputContainer: { marginBottom: 24 },
    input: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#dee2e6', fontSize: 18, letterSpacing: 2 },
    button: { backgroundColor: '#28a745', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16, elevation: 3 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    skipButton: { padding: 10 },
    linkText: { color: '#6c757d', textAlign: 'center', fontSize: 14 }
});
