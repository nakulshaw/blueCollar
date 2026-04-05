import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import api from '../../utils/api';

export default function PostJob() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [salary, setSalary] = useState('');

    const handlePostJob = async () => {
        if (!title || !description || !salary) {
            return Alert.alert('Error', 'Please fill all fields');
        }

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            let locationPoint = [0, 0];

            if (status === 'granted') {
                let loc = await Location.getCurrentPositionAsync({});
                locationPoint = [loc.coords.longitude, loc.coords.latitude];
            }

            await api.post('/jobs', {
                title,
                description,
                salary,
                locationPoint
            });

            Alert.alert('Success', 'Job posted successfully');
            router.back();
        } catch (err) {
            console.log(err);
            Alert.alert('Error', 'Could not post job');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Post a Job</Text>

            <TextInput
                style={styles.input}
                placeholder="Job Title (e.g. Plumber needed)"
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Job Description"
                multiline
                value={description}
                onChangeText={setDescription}
            />
            <TextInput
                style={styles.input}
                placeholder="Salary / Wages (₹)"
                keyboardType="numeric"
                value={salary}
                onChangeText={setSalary}
            />

            <TouchableOpacity style={styles.button} onPress={handlePostJob}>
                <Text style={styles.buttonText}>PUBLISH JOB</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: '#f4f6f8' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#dee2e6' },
    button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, shadowColor: '#007bff', shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});
